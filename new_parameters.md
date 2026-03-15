# New Parameters

Parameters to add on top of the existing implementation.

---

### `age_group`
- **Type:** enum
- **Values:** `teen`, `young_adult`, `adult`, `middle_aged`, `senior`
- **How set:** `set`

---

### `equipment`
- **Type:** enum
- **Values:** `none`, `basic`, `full`
- **How set:** `set`

---

### `session_duration`
- **Type:** enum
- **Values:** `micro`, `short`, `standard`, `extended`
- **How set:** `set`

---

### `schedule`
- **Type:** enum
- **Values:** `daily`, `few_times_week`, `twice_week`, `once_week`
- **How set:** `set`

---

### `barrier`
- **Type:** enum
- **Values:** `none`, `time`, `discipline`, `fatigue`, `pain`, `cost`
- **How set:** `set`

---

### `stress_level`
- **Type:** enum
- **Values:** `low`, `moderate`, `high`
- **How set:** `set`

---

### `sleep_quality`
- **Type:** enum
- **Values:** `good`, `average`, `poor`
- **How set:** `set`

---

### `body_goal`
- **Type:** enum
- **Values:** `lose_fat`, `gain_muscle`, `tone`, `maintain`, `improve_posture`
- **How set:** `set`

---

### `readiness_score`
- **Type:** integer
- **How set:** `delta`
- **Default:** `0`
- **Purpose:** Accumulates across the entire question flow. Each answer option carries a `delta` (positive or negative). High score → weights high-intensity offers (2, 4). Low score → weights lighter offers (1, 5, 7) or appends Offer 6.
- **Suggested thresholds:** `low` < 0, `mid` 0–5, `high` > 5

---

## Changes to Existing Parameters

### `constraints`
Add value: `both` (time + injury combined)

### `motivation`
Add values: `performance`, `mental`

### `preferences`
- Change to **multi-value** (array)
- Add values: `running`, `hiit`, `stretching`

---

## Notes

- `age` (integer) is superseded by `age_group` — remove or keep as internal derived field
- `wellbeing` is now derived server-side from `stress_level` + `sleep_quality`; keep the field but stop collecting it directly via a question node