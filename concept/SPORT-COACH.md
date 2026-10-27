# Sport / day companion implementation

## Available now

Ukrainian mobile UI; 91 distinct translated activity presets with exact codes and METs from the 2024 Adult Compendium of Physical Activities. Search, ten categories, custom activity, edit/delete, duration, distance, optional start time/notes, per-session historical weight snapshot. Activities include ordinary walking, running, strength, home video workouts, Pilates/yoga, bikes, swimming, dance, ball sports, daily chores and winter activities. A free-form custom session can be logged without a fabricated MET.

MET energy is a population estimate, not a measurement. Gross kcal = MET × 3.5 × weightKg / 200 × minutes; active kcal above rest = (MET − 1) × the same factor. UI differentiates both. Age19–59 model; if age is provided outside that range the calculator does not produce MET calories. Unknown age is explicitly documented as using the adult19–59 model. No calorie norm or deficit is assigned. No exercise compensation is added to food targets. Changing profile weight later never silently recalculates historical sessions.

Manual active energy from a watch can override the MET estimate per session. Daily active energy copied from a device is authoritative for the day and REPLACES, never adds to, the sum of known session estimates. Re-entering the day updates the same record. Steps never create an extra calorie estimate. Legacy sessions stay intact with unknown calories. An optional session toggle excludes duplicate energy; overlapping start times warn before saving. Session minutes are the sum of logged session durations and can still overlap; there is no claim of unique-time coverage.

Companion: a local deterministic rules engine, no live LLM or forecast. Recomputes after meals/sleep/workouts/settings. A prominent home card and header counter open daily/rolling7day summaries; calendar remains the second main screen. Optional, self-chosen P/F/C targets; unknown macro fields stay unknown, never inferred as zero for deficit warnings. Low-target tips wait for user-confirmed complete nutrition logs. A new/edited meal clears completeness. High amounts are compared with the chosen number without implying danger or predicting overeating. Short reported sleep(<7h) / reported fatigue prompts a qualified recovery/hunger note. Hunger/energy check-ins reflect the latest user report for that date. Sedentary context offers a gentle optional movement break. Advice categories and the companion can be disabled.

Diary sleep is elapsed time between supplied bedtime/wake time, not measured sleep stages, wake-after-sleep onset or a medical evaluation.7day summaries show count of nights with data; missing dates are not treated as zero sleep or proof of inactivity. Personal weekly movement target is optional and compared with a rolling7day window, clearly labeled.

## Primary references (accessed October23,2026)

- https://pacompendium.com/adult-compendium/
- https://pacompendium.com/conditioning-exercise/
- https://pacompendium.com/walking/
- https://pacompendium.com/running/
- https://pacompendium.com/bicycling/
- https://pacompendium.com/sports/
- https://pacompendium.com/water-activities/
- https://pacompendium.com/dancing/
- https://pacompendium.com/home-activities/
- https://pacompendium.com/winter-activities/
- https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/factors-affecting-weight-health
- https://developer.apple.com/documentation/healthkit
- https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- https://developer.android.com/health-and-fitness/health-connect/data-types

The exported activity catalogue keeps the source URL, code and actual MET per preset. These are average intensity estimates; no guaranteed error range is claimed.

## Native integration handoff

No browser access to HealthKit/Health Connect, background health reading or OS push exists in this static prototype. Device panels state "not connected"; the working input is explicitly manual. The future native app must request typed read access only with user consent: HealthKit workout/stepCount/activeEnergyBurned/sleepAnalysis and Android ExerciseSessionRecord/StepsRecord/ActiveCaloriesBurnedRecord/SleepSessionRecord. Request body mass only if needed for estimates, with a separate permission. Historical/background permissions require their own platform declarations. Do not claim that a successful authorization call proves read permission; treat unavailable data as unavailable.

A native adapter should normalize records with provider, stable externalId, source/device, time interval/timezone, updatedAt, activeEnergyKcal and provenance. Keep raw imported records separate from user-authored manual entries. Upsert by provider/externalId; keep revisions/deletions, and require an explicit conflict policy for manually edited imported records. Use platform aggregates and source priorities for overlapping step/energy records; do not sum iPhone and watch samples blindly. Apply sleep interval/category logic so "in bed" is not silently counted as "asleep". Show last successful read, denied/missing data and disconnect behavior; do not render a mock connection as successful.

Daily active energy encompasses workouts. Never add workout energy onto an already aggregated day. Display logged sessions as a breakdown; retain the day total as the primary aggregate. Partial-day device readings need a visible as-of timestamp. Device calories remain estimates.

A future AI service should receive only consented minimal normalized data; use a backend-held credential, explicit retention rules and a constrained response contract. Distinguish facts, missing data and suggestions. Never infer impending binge episodes, hormonal conditions, illness or a guaranteed result from these logs. Keep the current deterministic rules and source disclosure as a fallback.

## Checks

Run `node tests/core.cjs`, `node tests/flows.cjs`, `node tests/sport-coach.cjs`. They cover navigation, recipe/calorie flows, new session estimates, watch deduplication, optional fields, legacy data, missing macros, completion gating, short-sleep messages, check-in/settings backup roundtrip and resolved UI actions. Browser checks cover actual add-session form, reactive estimate and save, profile macro settings, auto-refresh of assistant, and mobile-frame layout. Physical iPhone/Android, native health and background behavior are not tested because they are not implemented here.
