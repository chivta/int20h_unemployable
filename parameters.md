# User Parameters for Offer Selection

Parameters collected during the question graph phase, used by the decision engine to score and select offer(s).

---

## Parameters

### `age_group`
- **Type:** enum
- **Values:** `teen` (13–17), `young_adult` (18–29), `adult` (30–44), `middle_aged` (45–59), `senior` (60+)
- **How set:** `set` (derived from a single age-range question)
- **Purpose:** Adjusts program intensity ceiling, recovery expectations, and copy tone. `senior` + `constraints=injury` strongly weights Offer 3. `teen` suppresses Offer 2 (heavy gym lifting).

---

### `gender`
- **Type:** enum
- **Values:** `male`, `female`, `unspecified`
- **How set:** `set`
- **Purpose:** Adjusts program framing, imagery copy, and default intensity suggestions. Not a hard filter for any offer.

---

### `goal`
- **Type:** enum
- **Values:** `weight_loss`, `strength`, `endurance`, `flexibility`, `stress_relief`
- **How set:** `set`
- **Purpose:** Primary scoring driver. Maps directly onto offers — most decisive single parameter.

---

### `context`
- **Type:** enum
- **Values:** `home`, `gym`, `outdoor`
- **How set:** `set`
- **Purpose:** Second strongest scoring signal after `goal`. Filters context-incompatible offers (e.g. `outdoor` eliminates Offer 1/5).

---

### `equipment`
- **Type:** enum
- **Values:** `none`, `basic` (resistance bands, mat), `full` (dumbbells, bench, etc.)
- **How set:** `set`
- **Purpose:** Refines `context=home`. `none` → weights Offer 7 (bodyweight micro-workouts). `basic`/`full` → opens Offer 1 and 5. Ignored when `context=gym`.

---

### `constraints`
- **Type:** enum
- **Values:** `none`, `time` (< 20 min/day available), `injury` (joint/back limitations), `both`
- **How set:** `set`
- **Purpose:** Hard filter. `injury` or `both` strongly suppresses high-impact offers and weights Offer 3. `time` or `both` weights Offer 7.

---

### `level`
- **Type:** enum
- **Values:** `beginner`, `intermediate`, `advanced`
- **How set:** `set`
- **Purpose:** Adjusts program complexity. `beginner` suppresses Offer 2 (progressive gym lifting) in favor of Offer 1 or 7. `advanced` adds score to Offer 2 and 4.

---

### `session_duration`
- **Type:** enum
- **Values:** `micro` (≤15 min), `short` (20–30 min), `standard` (30–60 min), `extended` (60+ min)
- **How set:** `set`
- **Purpose:** Finer-grained time constraint than `constraints=time`. `micro` → Offer 7. `extended` → Offer 2, 4. Correlates with but is independent from `constraints`.

---

### `schedule`
- **Type:** enum
- **Values:** `daily`, `few_times_week` (3–4x), `twice_week`, `once_week`
- **How set:** `set`
- **Purpose:** Determines program density. `once_week` + `goal=weight_loss` suppresses Offer 1 in favor of Offer 7 (more sustainable). Used in CTA copy to set realistic expectations.

---

### `motivation`
- **Type:** enum
- **Values:** `health`, `appearance`, `performance`, `energy`, `mental`
- **How set:** `set`
- **Purpose:** Shapes final offer narrative and CTA copy. `mental` boosts Offer 6 independently of `wellbeing`. `performance` boosts Offers 2 and 4.

---

### `barrier`
- **Type:** enum
- **Values:** `none`, `time`, `discipline`, `fatigue`, `pain`, `cost`
- **How set:** `set`
- **Purpose:** Informs CTA framing and narrative hook. `fatigue` + `discipline` boosts Offer 6 as add-on. `pain` acts like `constraints=injury`. `cost` flags user as price-sensitive → emphasize value framing in offer copy.

---

### `preferences`
- **Type:** enum (multi-value allowed)
- **Values:** `cardio`, `strength_training`, `yoga`, `running`, `hiit`, `stretching`
- **How set:** `set` (multiple can be selected)
- **Purpose:** Tiebreaker when primary parameters score equally. `yoga` + `stretching` → Offer 5. `running` → Offer 4. `hiit` → Offer 7.

---

### `wellbeing`
- **Type:** enum
- **Values:** `high`, `mid`, `low`
- **How set:** `set` (composite of stress/sleep/energy sub-questions, averaged)
- **Purpose:** Cross-cutting interceptor. `low` appends Offer 6 to any primary offer regardless of other parameters.

---

### `stress_level`
- **Type:** enum
- **Values:** `low`, `moderate`, `high`
- **How set:** `set`
- **Purpose:** Sub-dimension feeding into `wellbeing`. Also independently boosts Offer 6 if `high`. Allows finer-grained stress detection than `wellbeing` alone.

---

### `sleep_quality`
- **Type:** enum
- **Values:** `good`, `average`, `poor`
- **How set:** `set`
- **Purpose:** Sub-dimension feeding into `wellbeing`. `poor` + `stress_level=high` → strong Offer 6 signal. Also used in narrative framing (recovery-focused copy).

---

### `readiness_score`
- **Type:** integer
- **How set:** `delta` (accumulated throughout the entire question flow)
- **Default:** `0`
- **Purpose:** A running numeric signal of how ready/committed the user is. Each answer option carries a positive or negative delta — e.g. "I've tried gym workouts before" adds +2, "I've never exercised" adds 0, "I've tried and quit multiple times" adds -1. Accumulates across all questions. Used to weight offer intensity at the end.
- **Thresholds:** `low` < 0 → lighter offers (1, 5, 7) or appends Offer 6; `mid` 0–5 → neutral; `high` > 5 → high-intensity offers (2, 4)
- **Demo value:** This is the primary showcase for **multi-choice questions** in the admin editor — e.g. "Which of these have you tried?" with options each carrying a delta (resistance bands +1, gym machines +2, yoga +1, running +1). User selects multiple, all deltas accumulate.

---

### `body_goal`
- **Type:** enum
- **Values:** `lose_fat`, `gain_muscle`, `tone`, `maintain`, `improve_posture`
- **How set:** `set`
- **Purpose:** Complements `goal` with a body-composition angle. `lose_fat` + `context=home` → Offer 1 or 7. `gain_muscle` + `context=gym` → Offer 2. `improve_posture` → Offer 5.

---

## Offer Catalog Reference

| Offer | Primary match | Secondary signals |
|-------|--------------|-------------------|
| 1 — Weight Loss Starter (Home) | `goal=weight_loss`, `context=home` | `session_duration=short`, `equipment≠none`, `level≠advanced` |
| 2 — Lean Strength Builder (Gym) | `goal=strength`, `context=gym`, `constraints=none` | `level=intermediate\|advanced`, `motivation=performance\|appearance` |
| 3 — Low-Impact Fat Burn | `constraints=injury\|both` | `age_group=middle_aged\|senior`, `barrier=pain` |
| 4 — Run Your First 5K (Outdoor) | `goal=endurance`, `context=outdoor` | `preferences=running`, `level≠beginner`, `schedule=few_times_week` |
| 5 — Yoga & Mobility (Home) | `goal=flexibility`, `context=home` | `preferences=yoga\|stretching`, `body_goal=improve_posture` |
| 6 — Stress Reset Program | `wellbeing=low` OR `stress_level=high` | `motivation=mental`, `barrier=fatigue\|discipline`, `sleep_quality=poor` |
| 7 — Quick Fit Micro-Workouts | `goal=weight_loss`, `context=home`, `constraints=time\|both` | `session_duration=micro`, `schedule=daily`, `equipment=none` |

---

## Scoring Notes

- Each matched parameter for a given offer adds +1 to that offer's score (or a weighted score if edge weights are configured in the DAG)
- Offer 6 is appended on top of the highest-scoring primary offer — it does not compete with others
- When two offers tie on primary parameters, `preferences`, `motivation`, and `body_goal` act as tiebreakers in that order
- `constraints=both` triggers both Offer 3 logic (injury path) and Offer 7 logic (time path) simultaneously — highest scoring one wins primary slot
- `barrier=pain` is treated equivalently to `constraints=injury` in scoring

---

## Design Assumptions (README-worthy)

- `age_group` replaces raw `age` integer — avoids numeric input friction on mobile, sufficient granularity for offer differentiation
- `wellbeing` is derived server-side from `stress_level` + `sleep_quality` answers rather than asked directly — feels less clinical
- `preferences` is multi-value to allow "I like yoga and running" without forcing an artificial single choice
- `session_duration` and `schedule` are asked separately because a user can have 60 min available but only 2x/week — both matter for program fit
- `barrier` is distinct from `constraints`: `constraints` is a hard capability limit, `barrier` is a psychological/situational friction point that shapes copy