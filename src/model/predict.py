"""
Inference shim for relationship_signal_model.joblib.

Usage (called by Node via child_process):
  echo '<json>' | python3 predict.py

Input  (stdin):  JSON  { messages, userName, otherName }
Output (stdout): JSON  { effort_balance, ghosting_probability,
                         breadcrumbing_risk, lovebombing_risk,
                         boundary_violation_risk }

All output values are in the 0-1 range.
"""

import json, sys, warnings, os
import numpy as np

warnings.filterwarnings("ignore")

import joblib

MODEL_PATH = os.path.join(os.path.dirname(__file__), "relationship_signal_model_v4.joblib")
bundle = joblib.load(MODEL_PATH)

model         = bundle["model"]
tfidf         = bundle["tfidf"]
svd           = bundle["svd"]
targets       = bundle["targets"]
phrase_banks  = bundle["phrase_banks"]

# ── helpers ──────────────────────────────────────────────────────────────────

THREAD_GAP_S      = 30 * 60          # 30 min  → new conversation thread
GHOST_GAP_S       = 24 * 60 * 60     # 24 h    → reappearance cycle
MAX_RESPONSE_S    = 2  * 60 * 60     # 2 h     → cap for response-time average

def count_phrases(text: str, phrases: list[str]) -> int:
    text = text.lower()
    return sum(1 for p in phrases if p.lower() in text)

def reply_times(sorted_msgs, sender_name):
    """Return list of response-time seconds for the given sender."""
    times = []
    for i in range(1, len(sorted_msgs)):
        prev, curr = sorted_msgs[i-1], sorted_msgs[i]
        gap = (curr["timestamp"] - prev["timestamp"]) / 1000  # ms → s
        if curr["senderName"] == sender_name and prev["senderName"] != sender_name:
            if 0 < gap < MAX_RESPONSE_S:
                times.append(gap)
    return times

# ── main ──────────────────────────────────────────────────────────────────────

payload   = json.load(sys.stdin)
messages  = payload["messages"]          # list of {id, sender, senderName, content, timestamp}
user_name = payload["userName"]
other_name = payload["otherName"]

# sort by timestamp
msgs = sorted(messages, key=lambda m: m["timestamp"])

user_msgs    = [m for m in msgs if m["senderName"] == user_name]
partner_msgs = [m for m in msgs if m["senderName"] != user_name]
total        = len(msgs)

if total == 0:
    print(json.dumps({t: 0.0 for t in targets}))
    sys.exit(0)

# ── numeric features ─────────────────────────────────────────────────────────

total_messages        = total
user_messages         = len(user_msgs)
partner_messages      = len(partner_msgs)
partner_message_ratio = partner_messages / total if total else 0

def word_count(m):
    return len(m["content"].split())

avg_user_words    = (sum(word_count(m) for m in user_msgs) / len(user_msgs)) if user_msgs else 0
avg_partner_words = (sum(word_count(m) for m in partner_msgs) / len(partner_msgs)) if partner_msgs else 0
length_ratio      = avg_user_words / max(avg_partner_words, 1)

# initiation: who sends first after a gap > THREAD_GAP_S?
partner_inits = 0
total_inits   = 1
if msgs[0]["senderName"] != user_name:
    partner_inits = 1
for i in range(1, len(msgs)):
    gap_s = (msgs[i]["timestamp"] - msgs[i-1]["timestamp"]) / 1000
    if gap_s > THREAD_GAP_S:
        total_inits += 1
        if msgs[i]["senderName"] != user_name:
            partner_inits += 1
partner_initiation_ratio = partner_inits / total_inits

# response times
p_rts = reply_times(msgs, other_name if other_name else "other")
u_rts = reply_times(msgs, user_name)

avg_partner_reply_hours = (sum(p_rts) / len(p_rts) / 3600) if p_rts else 0
avg_user_reply_hours    = (sum(u_rts) / len(u_rts) / 3600) if u_rts else 0
partner_reply_std       = (float(np.std(p_rts)) / 3600) if len(p_rts) > 1 else 0

# reappearance cycles: partner disappeared > 24 h then came back
reappearance_cycles = 0
disappeared = False
for i in range(1, len(msgs)):
    gap_s = (msgs[i]["timestamp"] - msgs[i-1]["timestamp"]) / 1000
    if msgs[i-1]["senderName"] != user_name and gap_s > GHOST_GAP_S:
        disappeared = True
    if disappeared and msgs[i]["senderName"] != user_name:
        reappearance_cycles += 1
        disappeared = False

# partner decline ratio: compare partner ratio in first third vs last third
third = max(total // 3, 1)
first_third   = msgs[:third]
last_third    = msgs[-third:]
p_ratio_first = sum(1 for m in first_third  if m["senderName"] != user_name) / len(first_third)
p_ratio_last  = sum(1 for m in last_third   if m["senderName"] != user_name) / len(last_third)
partner_decline_ratio = max(p_ratio_first - p_ratio_last, 0)

# partner short replies (< 5 words)
partner_short_reply_ratio = (
    sum(1 for m in partner_msgs if word_count(m) < 5) / len(partner_msgs)
) if partner_msgs else 0

# phrase counts (over all messages; weight towards partner)
all_text     = " ".join(m["content"] for m in msgs)
partner_text = " ".join(m["content"] for m in partner_msgs)

vague_phrase_count    = count_phrases(partner_text, phrase_banks["vague_phrases"])
specific_phrase_count = count_phrases(partner_text, phrase_banks["specific_phrases"])
pressure_phrase_count = count_phrases(all_text,     phrase_banks["pressure_phrases"])
affection_count       = count_phrases(partner_text, phrase_banks["affection_phrases"])
repair_count          = count_phrases(partner_text, phrase_banks["repair_phrases"])
positive_count        = count_phrases(all_text,     phrase_banks["positive_words"])
negative_count        = count_phrases(all_text,     phrase_banks["negative_words"])

# unanswered last user message
unanswered_last_user_message = 1 if msgs and msgs[-1]["senderName"] == user_name else 0

# days span
days_span = (msgs[-1]["timestamp"] - msgs[0]["timestamp"]) / (1000 * 86400) if len(msgs) > 1 else 0

numeric = np.array([[
    total_messages, user_messages, partner_messages, partner_message_ratio,
    avg_user_words, avg_partner_words, length_ratio, partner_initiation_ratio,
    avg_partner_reply_hours, avg_user_reply_hours, partner_reply_std,
    reappearance_cycles, partner_decline_ratio, partner_short_reply_ratio,
    vague_phrase_count, specific_phrase_count, pressure_phrase_count,
    affection_count, repair_count, positive_count, negative_count,
    unanswered_last_user_message, days_span,
]], dtype=float)

# ── text features (TF-IDF → SVD) ────────────────────────────────────────────

tfidf_vec = tfidf.transform([all_text])     # shape (1, vocab)
svd_vec   = svd.transform(tfidf_vec)        # shape (1, 100)

# ── concatenate & predict ────────────────────────────────────────────────────

features = np.hstack([numeric, svd_vec])    # shape (1, 123)
preds    = model.predict(features)[0]       # shape (5,)

result = {t: float(np.clip(v, 0, 1)) for t, v in zip(targets, preds)}
print(json.dumps(result))
