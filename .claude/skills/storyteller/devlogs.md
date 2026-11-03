<!-- Researched 2026-11-03 from YouTube's captions of 5 videos (plus one transcript already in the repo), the
channels' video pages, storyboards and titles. Quotes are from the captions; anything marked unverified was judged on
title, thumbnail and views only. -->

# How ThinMatrix and The Sapling tell devlog stories — and what maiaCITY should take

Research of 2026-11-03 for maiaCITY's devlog Shorts and films. Two channels, twelve videos looked at, six read word for word.

## Method, evidence and limits

- **Channel listings** (all long-form uploads with view counts and durations) were pulled for both channels, as were their Shorts tabs. View counts in this file come from those listings, taken on 2026-11-03.
- **Transcripts.** YouTube's own captions were downloaded for 5 videos before YouTube started answering this machine with "Sign in to confirm you're not a bot". All later caption requests were refused, so no more were fetched. A 6th ThinMatrix transcript comes from captions Samuel pasted into the repo (`blog/day-00-test-story/sources/homegrown-devlog-farmers-market.md` on `SNAPSHOT_2611101`). All 6 are YouTube **auto-captions**, so I added the punctuation. Obvious mishearings are fixed in [brackets], e.g. "Aquila NOx" → [Equilinox], "sapping" → [Sapling], "sex cells" → [sex sells]. Anything unclear is marked *unclear*.
- **What is on screen** was read from YouTube's storyboard sprites. These are frames 160 px wide, taken every ~5 s (every ~10 s for devlog 4-3). The current thumbnails were read too. Short on-screen text is read off those frames. Small text, such as the clock times, is approximate.
- **Videos without a transcript** (the 10-year video, Bees, Evolution Simulated #1, the 7-day and 1-month streams) are analysed only from their title, thumbnail, duration and views, plus the developer's own itch.io posts where they exist. **Nothing about what is said in them is claimed.**
- **Secondary sources:** Wessel Stoop's interviews (Paperspace, about 2020; Kinesis Magazine, 2025), his itch.io devlog posts, and Hacker News comments. Reddit refused access, and I found no article in which Karl talks about how he makes devlogs.
- **Not verified:** "Ancient Island". No ThinMatrix video among the 370 uploads, and no game of his, has that name. His games are Socuwan (an MMO whose Kickstarter failed), Equilinox (2015–Nov 2018), an unnamed city-builder (from 2019) and HomeGrown (a farming game, made in Hamburg). The name may be a mix-up.

### The corpus

| Channel | Video | Date | Views | Length | Evidence |
|---|---|---|---|---|---|
| ThinMatrix | [A Day in the Life of an Indie Game Developer](https://www.youtube.com/watch?v=eRiyV1Kan24) | 2018-01-28 | 797k (#2 on the channel) | 10:38 | transcript, storyboard |
| ThinMatrix | [Programming a City-Building Game from Scratch!](https://www.youtube.com/watch?v=pib4IWX_9RM) | 2019-09-08 | 599k | 10:55 | transcript, storyboard |
| ThinMatrix | [Equilinox - Two Years of Game Dev: Part 1](https://www.youtube.com/watch?v=HK1ajrItIh0) | 2017-12-17 | 317k (Part 2: 136k) | 12:44 | transcript, storyboard |
| ThinMatrix | [3 Weeks of Programming the Farmers' Market](https://www.youtube.com/watch?v=Ld9qvxoaB6Y) (HomeGrown) | — | 86k | 18:17 | transcript (repo) |
| ThinMatrix | [My 10 YEAR Indie Game Development Journey](https://www.youtube.com/watch?v=FStOT4pP2tc) | — | 798k (#1 devlog) | 23:58 | title and thumbnail only |
| ThinMatrix | [Programming Bees for my Farming Game!](https://www.youtube.com/watch?v=_oZzIscVyDc) | — | 227k | 19:16 | title and thumbnail only |
| The Sapling | [Adding SEX to my video game (devlog 4-3)](https://www.youtube.com/watch?v=EBn7GamLVTU) | 2024-09-28 | 239k (#1 numbered devlog) | 15:13 | transcript, storyboard |
| The Sapling | [The next big update for my evolution sim (devlog 3-1)](https://www.youtube.com/watch?v=TDa7hEZ4DjY) | 2023-08-29 | 91k | 10:30 | transcript, storyboard |
| The Sapling | [New series "Evolution Simulated", starting under water (ES #1)](https://www.youtube.com/watch?v=x7Kc40SryVc) | Feb 2023 (per a third-party listing) | 527k (#1 on the channel) | 9:05 | title and thumbnail only |
| The Sapling | [This is what happens when you run evolution sim The Sapling for 7 days straight (F&F update edition)](https://www.youtube.com/watch?v=Py7HlheUKuM) | Nov 2021 | 489k | 8:11 | thumbnail, itch posts ([1](https://woseseltops.itch.io/thesapling/devlog/314771/this-is-what-happens-if-you-run-the-sapling-for-7-days-straight), [2](https://woseseltops.itch.io/thesapling/devlog/184624/running-the-sapling-for-7-days-straight-this-is-what-happened)) |
| The Sapling | [I streamed an evolution simulator for 1 month (extended cut)](https://www.youtube.com/watch?v=56cimkqkubY) | — | 382k | 23:56 | title and thumbnail only |
| The Sapling | [Why forests will be more interesting after the next update (devlog 6-1)](https://www.youtube.com/watch?v=MvRlpyNsGqA) | — | 88k | 9:44 | title and thumbnail only |

**A repo finding to fix.** `.claude/skills/storyteller/format.md` and the two source files give the URLs the wrong way round. In ThinMatrix's own listing, `Ld9qvxoaB6Y` is "3 Weeks of Programming the Farmers' Market" (18:17, which fits the 3,373-word transcript at ~185 wpm). Yet the files give `kza94XqkQQ8` for the devlog and `Ld9qvxoaB6Y` for LifeOfRiza. So `kza94XqkQQ8` is probably the LifeOfRiza video. That part is unverified, because YouTube was blocked.

---

## 1. ThinMatrix (Karl Wimble)

**Who he is.** An English solo developer who writes his own Java/OpenGL engines. He has 261K subscribers and 370 long uploads, and has made weekly devlogs since about 2014–15. He has only 2 Shorts. His story across the decade: hobby → failed Kickstarter (Socuwan) → Equilinox (meant to take "a few months", it took about three years) → full-time indie → city-builder → HomeGrown. A Hacker News viewer summed up the appeal in 2017: "his planning and consistency is admirable. He gets a lot done and is just very pleasant to watch/listen to" ([HN 15158485](https://news.ycombinator.com/item?id=15158485)).

### 1.1 The hook

| Video | The exact first lines | On screen, 0–15 s | Title/thumbnail promise → opening | The arching question |
|---|---|---|---|---|
| A Day in the Life | "Hello everyone and welcome to this week's behind the scenes devlog video, and this week of development so far has not been particularly exciting, it's mostly just been bug fixes… so for this week's video I thought I'd do something a bit different and just save up all the interesting tasks to do on Friday, so that I can have one exciting game dev filled day to show you." | 0–15 s: low-poly Equilinox landscapes. At ~20 s: his desk at dawn with a corner time stamp (≈"Friday 8:45"), then the **handwritten day plan pinned to a corkboard** (~25 s) and breakfast (~40 s). | The thumbnail is a real photo of his desk (game on one monitor, a low-poly bear model on the other), and the title is a format ("a day in the life"). The opening delivers that format at once: the plan, then the morning. | *Will one day get through the whole list?* The plan is the open loop, and the clock is the progress bar. |
| City-Building from Scratch | "Hello everyone and welcome to the start of a brand new journey, a whole new game which I'm going to be documenting every single step of from the very beginning all the way up until release, and I am so excited. I've had this idea for this game for over two years now… I very nearly, very nearly switched to this project." | A slow push-in on his sunny new office full of plants (0–20 s), then his **old notebook**, where Equilinox pages give way to city sketches (25–35 s). | The thumbnail is a diagonal split, **code on the left and a low-poly town on the right**. The title says "from Scratch!". The opening backs it with "the very beginning… until release", and later the first green square. | Series level: *will one person take a city-builder from nothing to release?* Episode level: *what is the starting point?* |
| Two Years, Part 1 | "Hello everyone and welcome to this week's special video, where we're going to be having a look back at the two years of [Equilinox] development, starting at the very beginning and going up to the point where we're at now… I'll also talk a little bit about some of the decisions that I made along the way, how I feel about those decisions now." | A present-day Equilinox beauty shot (0–5 s), then **archive footage**: 2015 terrain, the earlier failed game Socuwan, the train notebook. | The thumbnail says "Part I" over the game, and the title is the time span. The opening jumps at once to "the story starts way back in September of 2015". | *How did it get from that to this, and what did it cost?* 21 month-by-month chapters work as a counter. |
| Farmers' Market | "Hello everyone and welcome to another devlog video for HomeGrown. It's the start of a new week here in rainy Hamburg, and today finally I'm going to be working on some gameplay… the first feature that I'm going to be adding to it is the farmers market." | Not seen (no storyboard). | Title: "3 Weeks of Programming the Farmers' Market". The time span and the feature are both in the title. | *Will the market work before he leaves for the Alps?* The deadline arrives mid-video. |
| 10 YEAR Journey *(only the thumbnail was seen)* | — | — | The thumbnail is a transformation: **"10 years of gamedev!"**, then "hobby" → (arrow) → "full-time", with a running stick figure beside the HomeGrown village. | Unverified, because there is no transcript. The thumbnail promises a from → to. |

**Patterns**
- **A greeting first, then the frame of this one episode within 3–8 s.** "This week… I thought I'd do something different", "the start of a brand new journey", "this week's special video". The greeting works only because of years of trust. The real hook is the second sentence.
- **He names the low first.** "Not been particularly exciting… mostly just bug fixes" turns a dull week into a challenge he set himself. Leading with the honest low makes the high a choice.
- **The objection killer comes early.** In the city-builder video, at 0:41: "I know, I know there are already loads of town building games, I know… I've really thought through this a lot this summer… nothing excited me anywhere near as much as this project does."
- **The thumbnail and title promise a format or a transformation, never a feature list.** His numbered titles are his weakest (see 1.6).

### 1.2 Structure

**The weekly-devlog spine** (Day in the Life; Farmers' Market; most of HomeGrown):
plan (on paper or the whiteboard) → task 1: show the goal, build it, run it → a life break → task 2 … → the hard bug of the day → late-evening extras → **next week's plan and the release estimate** → sign-off.

- **Segment length: 60–150 s per task.** Day in the Life by chapters: intro 84 s (hook 20 s, plan and breakfast 23 s, "one interesting thing from earlier this week" 30 s), movement type 85 s, help pages and bears 80 s, sounds and world options 142 s, the hunting bug 80 s, logo 60 s, emails 20 s, the plan for the next weeks 55 s, outro 20 s.
- **The clock carries progress.** Spoken: "[about half nine?] now" (0:21, *unclear*), "[half past] 10 now" (2:03), "it's 12 o'clock now" (3:08), "it is coming up to 7 o'clock in the evening now" (6:52). On screen: corner stamps "Friday 8:45 … 10:15 … 17:12 … 22:37" (approximate) over desk shots that go from daylight to lamp-light to a night window over the city. In the Farmers' Market video: "It's a few days later now", "it is another few days later now", "it is 8:00 on Tuesday morning", "it's 20 to 6 now, I'm going to get some dinner".
- **A deadline turns the list into tension.** "I've only got two more days to work on this before I need to start editing the devlog video, because on Friday this week I'm going on a little summer holiday driving down to the Alps" (Farmers' Market). In Day in the Life, the Steam page "is going to take Steam I think 30 days to approve everything", and release is "optimistically… around the end of March".
- **A start episode is a mission statement.** In the city-builder video: the idea and the stakes (2 min) → the starting point, "I've got a green square, obviously you have to start somewhere" (3:06) → the **new method, argued from an old mistake**: "for [Equilinox] I had absolutely no plan, I just had an idea for the finished version of the game and I just set off blindly towards it… this time I'm going to work in small iterations" (3:32) → a feature built to be "future proof" (seasons as one variable) → an office tour as a life chapter (1:56) → a shout-out and sign-off.
- **A retrospective is a chronicle with a moral and a cliffhanger.** Two Years Part 1 opens on the failure ("a Kickstarter campaign for that game which was unfortunately unsuccessful"), walks month by month (each chapter ~15–50 s), stops for a reflection at 9:12–9:54 ("redoing things is a bit of a recurring theme in this video… I don't necessarily think that the constant redoing is a bad thing, unless of course it's just due to bad planning"), and **cuts off mid-story**: "then in November something quite important happens" (12:34, the last line). About 43% of Part 1's views went on to Part 2 (136k of 317k). What happened in November 2016 is not verified here.
- **The episode ends on a demo, then the next loop.** "To finish up this week I just want to show you a quick demo of the whole feature as it currently is, because I covered quite a lot in the video" (Farmers' Market), then patrons by name, then goodbye. In Day in the Life the ending is the plan for the next weeks and a release window.

### 1.3 Voice and storytelling

- **First person, diary tense, very fast.** ~199–207 words per minute in all three transcripts, and "I" used 2.4–4.5 times as often as "you" (108–150 against 33–45). The voice is "I've just been…", "I'm gonna…", "so…", "and then…". He narrates things *as they happen*. "But" makes up ~0.6% of words on average (0.4–0.9%), against The Sapling's ~1%, so the connective tissue is "and then / so": a diary, not an argument.
- **Self-deprecation as a running gag.** Estimating, three times over the years: "obviously estimating how long things are going to take is not one of my strengths" (Two Years, 0:55); "I was still obviously not getting any better at estimating how long things would take" (7:47); "and you know how bad I am at estimating how long things are going to take, so definitely take that one with a big pinch of salt" (Day in the Life, 10:08). The phrase "you know how bad I am" assumes a shared history, which makes the viewer an insider.
- **Small domestic jokes.** "No pens yet though, I forgot to buy pens" (City-builder, 8:33). About his favourite plant: "I read online that it's quite easy to accidentally kill it, so we'll see how long he's here for" (8:55). "The in-game clock has been saying that it's Monday 12:45 for about the last 6 months." "I spend most of my time putting up bunting." "…so that they're not standing around like creepy statues anymore" (Farmers' Market).
- **Bugs as comedy, the cause as one plain sentence, then the fix running.** "Sometimes it just never drops it off and it just runs around with it in its mouth for the rest of its life, sometimes it tries to eat the meat while it's still in its mouth" → "when the animal that it was hunting died, it's only meant to notify the hunter once, but it was notifying the hunter multiple times, and that meant that the predator queued up the AI for carrying the meat multiple times" → "you can see that the hunting is now working pretty nicely" (Day in the Life, 6:32–7:50).
- **Technical ideas, explained by what the player would feel.** "If it does it here in the main thread then it would cause the game to freeze… so what happens with the background loading system is that when the game comes across something that needs to be loaded it simply passes it to the resource loading thread and then continues, so the game doesn't [freeze] at all" (City-builder, 6:18). Symptom → mechanism → benefit, with no jargon left unexplained.
- **Stakes come from his life, not from drama.** A failed Kickstarter; "I was looking to find a job"; full-time indie money; Steam approval; release dates; a new flat and office. There is never an artificial crisis. The stakes are that this is his job and he keeps saying when it will ship.
- **Why viewers root for him:** visible competence (he writes the engine himself), visible humility (the estimating gag), a visible routine (the daily run, breakfast, soup by candlelight, piano, painting), and **viewers as participants**: "thanks to everyone for your feedback about the logos", "perhaps after that we can have a final vote", "I'd love to hear your feedback on it", patrons thanked by name.
- **Catchphrases:** "Hello everyone and welcome to…", "as you can see" (2–5 times per video), "obviously" (5–6 times per video), "have a wonderful week and I will see you all next time" / "I hope you have a fantastic week".

### 1.4 Visuals and editing

- **Three kinds of footage:** (1) screen recordings of the game and the IDE, (2) real-world desk and room footage (wide tripod shots, push-ins, close-ups of hands typing and hands on the notebook), (3) life B-roll (breakfast, coffee, cooking, the city window at night). He never talks to camera in the analysed videos; he is a voice over his hands, his room and his screen.
- **Thumbnails:** desk photos (Day in the Life; "One step closer…" HomeGrown); a diagonal **code | game** split ("BEES", "FARM GAME DEVLOG", the city-builder); a big-number transformation ("10 years of gamedev! hobby → full-time").
- **Captions as asides:** "Very, very rough concept art!" over early renders (City-builder, ~60–70 s), lowering expectations in the frame itself.
- **Music** is a soft background bed (credited to Jamal Green in descriptions). The "[Music]" marks in the captions fall at segment changes (Day in the Life: 1:13, 2:28, 4:29, 10:32), so a musical swell works as an act break. There are no sound-effect gags.
- **How a bug is shown:** straight gameplay, uncut, while he narrates it. The comedy lives in the words, not the edit.
- **How a reveal is shown:** "So if I now go ahead and generate this world, you can see that it's created a nice big world" — a live demo in one take, introduced with "as you can see". A sequence ends on its *after*, never on a promise.
- **Archive as a time machine** (Two Years): old builds, old notebooks and the earlier game cut in chronologically. Equilinox beauty shots open and close the video.

### 1.5 Retention devices

- **Open loops:** the day plan (Day in the Life), the deadline (Farmers' Market), "I will tell you more about the project and show you what I'm working on in a bit" (City-builder, 1:44), and the Part 2 cliffhanger.
- **Mini-payoffs every 1–2 minutes:** every task ends on it working on screen.
- **Pattern interrupts:** breakfast (0:40), "go for my daily run in the park" (2:28), dinner (≈8:00), the night window; "just on my laptop at the moment 'cause I wanted to chill out on the sofa"; the salad "with quite a few things from the balcony" (Farmers' Market); the office tour (City-builder, 8:21–10:05).
- **A small extra early:** "Before I get started I just want to quickly show you the one interesting thing that I was working on earlier this week" (0:44). A payoff in the first minute, before the long list.
- **Endings:** next week's plan, an honest estimate, patrons, and the sign-off line. These are soft endings. The pull to come back comes from the series, not the cut.

### 1.6 What makes ThinMatrix distinctive

The **weekly diary of a pleasant, competent man, ten years long**. Retention is built on trust and routine rather than editing. The ritual is the product: the same greeting, the same desk, the same honesty, a new step each week.

The title data supports the framing (medians of his whole channel; the channel grew over time, so era is partly behind this):

| Title form | n | Median views | Max |
|---|---|---|---|
| "Indie Game Devlog #N" / "Behind the Scenes #N" | 92 | 16k | 100k |
| "Equilinox - Java Game Devlog N: …" | 22 | 22.5k | 151k |
| "HomeGrown Devlog - X" | 13 | 90k | 259k |
| "Programming / Implementing / Designing X for my Y Game" | 30 | **125k** | 599k |
| Day / week / life / "N years" framings | 26 | 84k | **797k** |

A verb, a concrete thing and the game's genre ("Programming Bees for my Farming Game!") beat an episode number by a wide margin. The two biggest devlogs are *formats about his life* (a day; ten years), not features.

---

## 2. The Sapling (Wessel Stoop)

**What he builds.** *The Sapling*, an evolution and ecosystem simulation. Players design plants and animals (algae, plants, animals with body parts), and either solve scenarios ("design an ecosystem that meets specific requirements") or run a sandbox with random mutations and watch evolution happen. It went into Early Access in 2019 on Steam and itch.io. He started it as the simulation that Spore was not: "Spore did a lot of things very right… but simulation was not one of those genres" ([Paperspace interview](https://blog.paperspace.com/an-evolution-in-gaming/)).

**Who he is.** A developer with a background in linguistics and language technology; that he is Dutch is suggested by his name and filming locations but not verified. He built the game "in my free time, much of it early in the morning when the rest of my family was still asleep, and during long train rides to work" (Paperspace). The channel has 65.8K subscribers, 62 long uploads and 18 Shorts, and was created in October 2018. A design principle he states himself: "whatever I'm building, it should be something I can visualise" ([Kinesis, 2025](https://kinesismagazine.com/2025/06/06/simulating-evolution-from-one-humble-sapling/)).

**Formats:**
1. **Seasons of numbered devlogs**, one season per update, 5–6 weekly episodes that reveal it bit by bit. "devlog 4-3" means season 4, episode 3, and the thumbnail carries a "DEVLOG s4 e3" tag. On itch he announced the next update as "a series of 6 devlogs on YouTube", with features shown "gradually".
2. **Stories the simulation tells**: Evolution Simulated #1–6, "run for 7 days straight", "streamed for 1 month", a 14-day stream "with a moving continent", and "I hired a David Attenborough impressionist to narrate my game".
3. Trailers.
4. **Shorts**: overviews of each update, and short episodes of the livestream's evolution.

Simulation stories vastly outperform devlogs:

| Format | n | Median views | Max |
|---|---|---|---|
| Numbered devlogs ("devlog s-e") | 33 | 51k | 239k |
| Simulation stories (Evolution Simulated / N days / streamed) | 9 | **246k** | 527k |
| Trailers | 6 | 17k | 45k |

### 2.1 The hook

| Video | The exact first lines | On screen, 0–15 s | Title/thumbnail → opening | The arching question |
|---|---|---|---|---|
| Devlog 4-3, "Adding SEX…" | "I am adding sexual reproduction to the simulation and it is like putting a multiplier on all cool phenomena. And if that's the case you might wonder: you've been working on this game for years now, what took you so long? Well, because it's also an opportunity to do something much bigger, because it doesn't necessarily stop at two sexes that remain the same throughout an animal's lifetime. In this video we will go over all stages and possible side paths, from asexual reproduction via animals with a [larval] stage all the way to species with a separate worker and queen form. This is the scary and sexy update." | ~10 s: a **handheld close-up of his face outdoors** with kinetic text, "BUT **WHY** DID IT [TAKE…]". ~20 s: standing in heathland in a T-shirt with the game's logo. ~40 s: the game's planet screen. | The thumbnail is giant white "SEX" letters behind cute creatures, tagged "DEVLOG s4 e3", and the title is "Adding SEX to my video game". The cheeky promise is cashed in the first sentence, then raised ("much bigger… worker and queen form"). | *Why did it take so long?* (a promise to answer it), carried by the roadmap's last stop (the queen form). |
| Devlog 3-1, "The next big update…" | "If you have ever played a factory build[ing] simulation game like Factorio or Satisfactory for more than a few hours, you have probably come to the realization that you made a decision at the beginning of the game that is now making it really hard to expand your factory without making it really, really messy. It's a feeling I know really well from programming, and it's in fact normal: it's called refactoring… What I did not know is that it does not just happen during programming; sometimes game design needs to be cleaned up as well. And in my case, as I was cleaning up game mechanics, one thing led to another and before I knew it I had a whole new update." | 0–5 s: a macro shot of real nature (a bee on a bramble flower). 10–20 s: **Factorio and Satisfactory clips in rounded cards over blurred nature**. 25–45 s: a selfie close-up in the woods with a **dictionary card, "re·fac·tor (verb)"**, and kinetic "SOMETIMES GAME DESIGN". ~85 s: a logo sting ends the cold open. | The thumbnail says "ANOTHER UPDATE!", "DEVLOG s3 e1", with two creatures. The opening turns a chore (cleaning up) into the origin of something big. | *Where exactly did I mess up, and how did a clean-up become an update?* He asks it outright at 1:22: "So where exactly did I mess up?" |
| ES #1 *(not transcribed)* | — | — | A **two-part thumbnail**: "I designed some fish" (top) / "THEY EVOLVED" (bottom), over an underwater scene. | A setup-and-payoff question: *what did they become?* (inferred from the thumbnail). |
| 7 days, F&F edition *(not transcribed)* | — | — | Thumbnail: "#2 · RUNNING AN EVOLUTION SIMULATOR FOR 1 WEEK", a big red creature. Title: "This is what happens when you run…". | *What happens if nobody touches it for a week?* His itch post: "It seemed a rather innocent idea… let it stream The Sapling with random mutations on, and watch what happens." |
| 1 month *(not transcribed)* | — | — | Thumbnail: "31 days of evolution", with four creatures labelled **DAY 1 · DAY 2 · DAY 11 · DAY 26**, a progression lineup. | *What does day 31 look like?* |

**Patterns**
- **The first sentence is a claim or the viewer's own experience, never a greeting.** He makes a bold metaphorical claim ("a multiplier on all cool phenomena") or names a feeling every gamer has had (the messy Factorio base), then turns it ("…sometimes game design needs to be cleaned up as well").
- **He says the viewer's objection for them**, "you might wonder… what took you so long?", and promises the answer.
- **A roadmap to the most extreme point.** "All the way to species with a separate worker and queen form." The viewer waits for it; workers, soldiers and a large reproducing form come at ~12:30 of 15:13.
- **The update gets a name** ("the scary and sexy update"; "the food and [fire] update", confirmed by the Short "Food & Fire update overview").
- **Fixed boilerplate after the hook, at ~0:38–0:58, nearly word for word every time:** "For those of you new here, this is evolution simulation game The Sapling, my solo indie game project. It has two game modes: there are scenarios tasking you to design an ecosystem that meets specific requirements, but there's also a sandbox where you can build your own algae, plants and animals, turn on random mutations and see how they evolve."

### 2.2 Structure

An **argued essay**, not a diary: question → theory → problem → design decision → twist → escalating ideas → answer → bonus.

- **Devlog 4-3, by chapter.** Intro 0:00–0:58. "What is even the advantage?" 0:58–2:55: a toy simulation of 100 animals and fitness, drawn as population icons and line graphs, with the Python script on GitHub. "How to implement sexual reproduction" 2:55–5:35: plants already blend; a genitals joke; who can mate with whom → the family-tree rule; "after countless hours trying to design something simple and elegant I suddenly had the [insight] that everything I wanted could be summarized into four toggles". New eggs 5:35–6:37. Sexes 6:37–10:35: up to six sexes, sexual dimorphism, then the pain under the hood: "the real headache started when I realized the new system would need to interact with every single little caching mechanism in the game". Metamorphosis 10:35–11:37. Gameplay ideas 11:37–13:38: an escalating list. **Answer** 13:30. Bonus body parts 13:55–15:13.
- **Devlog 3-1, by chapter.** Intro 0–1:22. Revising food 1:22–4:55: the history of the food system as a flowchart that keeps growing, and a playtest ("players had to figure this out on their own, so I organized some play tests to figure out if players understood this, and the answer was no, they didn't"). New mouth types 4:55–8:03: 23 mouths and the argument for arthropods. Seeds 8:03–9:00: 15 seed types. Upcoming devlogs 9:00–9:34. Outro music.
- **Segments run 1–4 minutes.** Each chapter title is a question or a promise ("what is even the advantage?").
- **Progress is shown as counts and growing diagrams**, not as a clock: "23 new [mouths] for you guys to play with", "there will be 15 different seed types". The flowchart grows a branch per update. Before/after splits appear in later thumbnails ("before | after", devlog 6-1).
- **The season tease is the cliffhanger:** "Over the coming five weeks I plan to release a weekly devlog in which I will explain many more new food types and seed types" (3-1, 9:18).

### 2.3 Voice and storytelling

- **A teacher's voice, scripted, aimed at "you".** 162–186 words per minute. In 4-3, "you" (49) beats "I" (45) and there are 14 "we" (e.g. "let's say we have a population of 100 animals"). "But" makes up ~1% of words, about 1.5× ThinMatrix's average. That is a but/therefore argument.
- **Science stated plainly, using the real world.** Elephants: "although elephants are slow animals all parts are continuously in motion, slowly, but they move". Locusts ("if this happens enough times per minute during a 4-hour period they transform into this swarm form"). Temperature sex determination "just like in turtles and crocodilians". Convergent evolution ("shark fins and dolphin fins are really similar… a beautiful phenomenon"). The toy model makes the abstract visible: "with asexual reproduction the same thing might happen, but it also might not happen, you don't know, while with sexual reproduction it always goes up and it's always fast".
- **His principle as a catchphrase:** "You know how I always say that if you simulate something you should also visualize it" (3-1, 6:53). He uses it to argue for arthropod mouths, because their mouthparts are outside the body and visible.
- **Honest about mistakes and doubt.** "So where exactly did I mess up?" (3-1). "I think the animation is where my game looks the most amateurish" (3-1, 5:50). "This is mainly here to fix a stupid mistake I made… several [paleontologists] however were friendly enough to point out that this particular mouth… was actually not a filter feeder but a predator, so let's try again" (4-3, 14:40). And the biggest: "This is a topic that I really needed to nerd out on, and I have to admit I kind of lost sight on whether actual players will also like this" (4-3, 13:38).
- **Dry, cheeky humour, used once per video and then dropped.** "We all know what will happen if I add a penis body part to a game where everybody can place as many body parts wherever they want. Apparently the [Spore] developers even [coined] TTP as a technical term for this phenomenon, meaning time to penis, and let me tell you, the TTP for this game would be so short that it wouldn't be good for its reputation" (4-3, 3:23). A pun to close: "all I can do now is wait and see whether [sex sells] is also true for a video game about evolution" (13:50).
- **The player is the designer.** "It will be up to the player to create up to six sexes and define what each sex is." "As you can see, I've designed the icons to really make clear what kind of things I hope the players will do with this." Every feature becomes a toy offered to the viewer.
- **Stakes are intellectual and personal, never dramatic.** Will the design stay "simple and elegant"? Will players like it? Can the machine still run it ("optimization mechanisms all over the place to prevent frame rates in single digits")?
- **The community is in the story:** bug reporters thanked by name in 3-1; paleontologists correcting him; fans spotting a 1-second spoiler. From his itch post: "despite me painstakingly blurring all spoilers in previous devlogs, I missed 1 second of material showing a primitive wing, and of course somebody noticed <3". In a stream title: "You name the species."

### 2.4 Visuals and editing

- **A presenter on location in real nature.** He stands or sits in heathland, woods or by a lake (once with an industrial chimney behind him), handheld and selfie-close or wide, always wearing the game's logo. The real world sits next to the simulated one in every video.
- **Motion graphics over blurred footage:** flowcharts (mouth → food), population icons with parent lines, fitness line graphs, DNA icon → "abcdef" gene strings, sex A/B icons. In 4-3 the **family tree is drawn onto a real bare tree** he stands next to.
- **References in rounded picture-in-picture cards:** Factorio, Satisfactory, Spore, real locusts, aquarium sharks (cut straight to the in-game shark fin), a skate's egg case.
- **Kinetic typography and definition cards** ("re·fac·tor (verb)", "BUT WHY DID IT…").
- **The process shown honestly:** sketching icons in Photoshop, grey Blender models (the bonus parts), the creature editor.
- **How a failure is shown:** as a diagram of the old, messy system and a playtest verdict, or as a side-by-side comparison ("if you look at them side by side the difference is smaller than I'd hoped for").
- **How a reveal is shown:** a creature built in the editor, then the same creature living in the world; the toy graph's lines snapping upward; a logo sting at the end of the cold open.
- **Thumbnails:** one huge word or a short claim, a creature, and a season/episode tag. For simulation stories they use a **setup-and-payoff split** ("I designed some fish / THEY EVOLVED") or a **timeline lineup** (DAY 1 · 2 · 11 · 26).

### 2.5 Retention devices

- **A question at the start, an answer at the end:** "which is effectively the answer to the question we started with: why did it take so long for sexual reproduction to be added?" (4-3, 13:30).
- **The extreme the roadmap promised** (workers and a queen-like form) is held for the last third.
- **An escalating list with spoken "one more" beats:** "Okay, now this is cool, let's do one more", then "but my favorite idea, and I will really stop after this one, is inspired by some grasshopper species…" (4-3, 12:30–12:57).
- **Twists inside segments:** "but okay, these are just two mouths. Where did I get the inspiration for 21 others? That's where these guys come in" (3-1, 6:07). "But I totally didn't mention that other innovation that often goes together with sexual reproduction" (4-3, 6:43).
- **A bonus after the credits** ("today's first bonus body parts are shark fins…") rewards viewers who stay to the end.
- **The season** as the long open loop. **Spoiler blurs** make the viewers detectives.
- **Endings are short:** "okay, bye" (4-3).

### 2.6 What makes The Sapling distinctive

**A science-explainer channel whose subject happens to be his own game.** The game is a lens on real evolution. The simulation produces stories nobody scripted, and those stories (fish → land, one species conquering a continent, a month of evolution) draw five times the views of the devlogs. The devlogs explain *why the next update will make those stories richer*: "Why forests will be more interesting after the next update". Every devlog title in season 6 promises a richer world, not a feature (forests, oceans, seasons).

---

## 3. Side by side

| | ThinMatrix | The Sapling |
|---|---|---|
| Engine of the story | the clock and the plan (a diary) | the question and the answer (an essay) |
| First line | a greeting, then this episode's frame | a claim or a universal experience |
| The person | a voice over hands, desk and room; life B-roll | a presenter on camera in nature |
| Words per minute | ~199–207 | ~162–186 |
| Pronouns | "I" 2.4–4.5× "you" | "you" ≥ "I", plus "we/let's" |
| "But" per word | ~0.6% (0.4–0.9%) | ~1% |
| Progress shown by | time stamps, days, demos, the release estimate | counts (23 mouths, 15 seeds), growing diagrams, before/after |
| Bugs and failures | comedy narrated over gameplay, then one-line cause, then fixed | messy flowchart, a playtest's "no", corrections credited |
| Interrupts | breakfast, run, dinner, the night window, the office tour | real nature and real animals, jokes |
| Ending | demo → next plan → patrons → "wonderful week" | answer → bonus parts → "okay, bye"; the season tease |
| Biggest hits | formats about his life (a day, 10 years) | stories the simulation tells (N days, Evolution Simulated) |
| Shorts | 2 (he barely uses them) | 18: update overviews (98k, 74k, 63k) and episodes of the stream |

---

## 4. Lessons for maiaCITY

The house rules come first. `storyteller` law 7 (Samuel, 2026-11-03) says: **"Never talk about AI".** No line, caption or title says "AI", "our AI" or "an AI". The work is told as *we* and *I*. The brief's "an AI called Maia does the dev work and Samuel directs" therefore **cannot be the hook**. The solo dev's honest first person transfers to Samuel, and Maia's work appears as *the work being done*, seen working. `format.md` already took ThinMatrix's weekly-devlog devices (one goal in the first breath, plan → build → show, the clock, the deadline, life between work, honest scope, the demo, the community). The rules below add what that file lacks, or sharpen it.

1. **Title the change, never the number.** Use a verb, a concrete thing and the city: "Growing tomatoes in our first dome" or "We let the city run for 7 days". Never "Devlog #12". Evidence: ThinMatrix's numbered titles have a median of 16k against 125k for "Programming X for my Y Game", and The Sapling's numbered devlogs 51k against 246k for its simulation stories. Keep the episode number as a small corner tag ("DAY 19", like "DEVLOG s4 e3"), never as the title.
2. **The first spoken line is a claim or the viewer's own experience, not a greeting.** "Hello everyone" works for Karl after 10 years of trust; we have none yet. Use The Sapling's two openings: the bold claim ("it is like putting a multiplier on all cool phenomena") or the shared feeling ("if you have ever… you have probably…") that then turns to us. In a Short, this line plus the picture of the end state must land in the first 2 seconds.
3. **Say the viewer's objection out loud in the first 15 seconds, and promise the answer at the end.** Sapling: "you might wonder… what took you so long?", answered at 13:30. Karl: "I know, I know there are already loads of town building games". For us, the reflexes are "that's just a game", "nobody will ever build that for real" and "solarpunk is a fantasy". End the film by saying, in so many words, that this was the answer to the question we started with.
4. **Give a roadmap to the most extreme point, and pay it off last.** "From X via Y all the way to Z", where Z is the one picture the viewer cannot imagine yet (the queen form). Plant Z in the intro and hold it for the last quarter.
5. **Let the city tell stories nobody scripted, and make them their own series.** The Sapling's simulation stories beat its devlogs fivefold. maiaCITY's sandboxes can run on their own: give them "We let the city run for 7 days. This is what happened" episodes, made from saved versions. Wessel made one by accident: backups he wrote against crashes "had the unintended side effect that I can now go back to various stages… and relive what happened". play already keeps every asset version, so use that history as the time-lapse.
6. **Pair the game with the real thing in the same frame.** Wessel cuts aquarium sharks to the in-game fin, and draws the family tree onto a real tree. maiaCITY's whole premise is *built first as a game, then for real*, so every world shot should have its real counterpart nearby: the real dome, garden or street beside its 3D twin, in a rounded card or a cut. This is also our thumbnail: a **game | real** split, replacing Karl's code | game.
7. **Show a failure as comedy in the city's own terms, then one plain sentence of cause, then the fix running.** Copy Karl's fox that "runs around with [the meat] in its mouth for the rest of its life". For us: a citizen who walks into a dome wall forever, or a bean that grows sideways. The cause is one sentence anyone can follow (symptom → mechanism → benefit), and the sequence never ends on the promise, only on the after.
8. **Simulate, then visualise: every number becomes a moving picture.** Wessel's principle is a catchphrase. His 100-animal fitness toy model turns a theory into a line on screen. maiaCITY's numbers (kWh, litres, kg of food, people housed) appear as things growing, filling or moving in the world, never as a spoken figure alone. Give Samuel one such line to repeat across episodes, e.g. "if we build it in the game, we have to be able to show it working".
9. **Keep one honest running gag.** Karl's estimating is fond, recurring and self-mocking: "you know how bad I am at estimating…". Wessel says outright: "I kind of lost sight on whether actual players will also like this". Choose one true, small, repeatable weakness of Samuel's, found in footage, never invented, and let "you know how I…" turn viewers into insiders.
10. **Name each update and run it as a season.** One update = 5–6 short episodes, named like "the scary and sexy update", each standing alone, the season promised at the end of its first episode ("over the coming five weeks I plan to release a weekly devlog…"). Give each episode a 15-second "for those of you new here" case, said in new words every time (`format.md` agrees).
11. **Mark the clock on screen as well as in speech.** Karl's corner stamps ("Friday 8:45 … 22:37") and the light going from daylight to lamp to night window are free structure. Ours: "DAY 19 · 08:45" in a fixed corner, with real light changing in Samuel's room. Use a counter when the progress is not time ("23 new mouths"): "12 of 40 domes".
12. **Put a pattern interrupt every 60–150 seconds, and make it turn something.** Karl: breakfast, a run, soup, a night window, the office tour. Wessel: walking the heath, a real locust. Karl's are pure breathers; ours should each carry a doubt, a decision or a person (`format.md`).
13. **Give a small payoff in the first minute, before the long build.** "Before I get started I just want to quickly show you the one interesting thing that I was working on earlier this week" (Karl, 0:44). Long films open with a finished thing from yesterday; Shorts *are* that thing.
14. **End on the demo, then the open loop, then a reward for staying.** Karl: "a quick demo of the whole feature", then next week's plan. Wessel: the answer, then bonus parts, then "okay, bye". Split long stories so they break mid-sentence: "then in November something quite important happens" carried ~43% of Part 1's viewers into Part 2.
15. **Make viewers co-authors, and credit them by name.** Karl's logo vote; Wessel's "you name the species", the paleontologists who corrected him, the fans who spotted a 1-second spoiler. For maiaCITY: founders name a street, vote on a dome's colour, and are corrected on screen, thanked and shown.

### What to steal for Shorts, and what stays in long form

- **Shorts (≤60 s), from The Sapling:** the simulation-story Short, "Why [named thing] [surprising verb]" or "How one [thing] [did something big]" (his titles: "Why Datopyrus eats babies", "How one species split in two", "What happens when the evolution simulation enters an ice age"); the overview of each update (his best Shorts: 98k, 74k, 63k); the setup-and-payoff split ("I designed some fish / THEY EVOLVED"); before/after. (The content of his Shorts is unverified; only titles and views were read.)
- **Shorts, from ThinMatrix:** the single "as you can see" reveal (one task: goal → bug → fix running) as the loop; the "N years / hobby → full-time" from → to as a 3-frame then → now.
- **Long form only:** the full day on the clock (Karl), the month-by-month retrospective, the 15-minute essay with graphs, and the escalating "one more" list. Each needs 8–15 minutes to breathe.
- **What doesn't fit at all:**
  - Karl's ~200-wpm, unbroken, I-heavy diary voice with a greeting first. It is too slow for Shorts and too much about the self for a movement's "we".
  - Karl's code-split thumbnails assume programmers; our audience is solarpunk and civic, so split game | real instead.
  - Wessel's sex/TTP humour is off-brand. Take the timing of the joke (one per film, then move on), not the topic.
  - Both are "solo indie dev" frames. maiaCITY has a director and a builder, and law 7 forbids naming the builder as an AI. The honesty transfers to Samuel's "I/we", and the work is shown, not attributed.

---

## 5. Three hook patterns derived from the rules

The examples are **illustrative wording to show the shape, not facts**. Swap in true numbers and events before use (`storyteller` law 8, "invent nothing"). Each is labelled in the `hook-writer` anatomy.

**A. Claim → objection → roadmap to the extreme** (rules 2, 3, 4; from Sapling 4-3). Fits long-form intros and Short openers.
Template: *"We're [adding X] to the city, and it [changes everything about Y]. You might ask: [the viewer's objection]? Because [the bigger reason]. By the end of this video we'll go from [now] via [step] all the way to [the extreme picture]."*
```
HOOK      We gave the city rain, and now every roof has a job.
          SUBJECT we · ACTION gave · END STATE every roof has a job
          CONTRAST rain as weather ↔ rain as supply · ANCHOR curiosity
PROMISE   From one gutter, via a cistern, all the way to a dome that never needs the mains.
OBJECTION "It's only a game": every roof here is drawn to be built, to the real metre.
```

**B. The shared feeling → it happens to cities too** (rules 2, 7; from Sapling 3-1). Fits devlogs about a mistake or a rebuild.
Template: *"If you've ever [an everyday frustration], you know the feeling of [the consequence]. It turns out [cities / our first village] do the same, and fixing it [gave us something new]."*
```
HOOK      If you've ever bought a sofa that didn't fit through the door, you know our first village.
          SUBJECT you → our first village · ACTION bought / didn't fit · END STATE the village had to be redrawn
          CONTRAST a flat's door ↔ a whole village · ANCHOR recognition, then curiosity
PROMISE   What we got wrong, why it was normal, and the better street it gave us.
OBJECTION Not a failure: the version history keeps every wrong turn, and here is the one that taught us most.
```

**C. Then → now on a counter** (rules 1, 5, 11; from Karl's "10 years: hobby → full-time" and Sapling's "DAY 1 · DAY 2 · DAY 11 · DAY 26"). Fits Shorts and thumbnails, as a split or lineup card with the counter on screen.
Template: *"Day 1: [the green square]. Day N: [the picture nobody expects]. Here's every step in between."*
```
HOOK      Day 1 it was a green square. Day 60 it feeds 200 people.
          SUBJECT it (the city) · ACTION feeds · END STATE 200 people fed · TIME Day 1 → Day 60
          CONTRAST empty square ↔ a city that feeds people · PROOF the day counter · ANCHOR disbelief
PROMISE   Every step in 60 seconds, from the saved versions.
OBJECTION Not a render: each step is the world as it was saved that day.
```

---

## Sources

- ThinMatrix: [channel](https://www.youtube.com/@ThinMatrix); videos as linked in the corpus table, plus [Two Years Part 2](https://youtu.be/-iLDjSof4ZU). Repo: `blog/day-00-test-story/sources/homegrown-devlog-farmers-market.md` (branch `SNAPSHOT_2611101`). Hacker News comments [15158485](https://news.ycombinator.com/item?id=15158485) and [49493781](https://news.ycombinator.com/item?id=49493781) ("ThinMatrix on youtube is a delightful watch").
- The Sapling: [channel](https://www.youtube.com/@TheSapling); videos as linked in the corpus table, plus the [original 7-day stream video](https://www.youtube.com/watch?v=flmm-Y5KePo). Shorts titles from the channel's Shorts tab. [itch.io devlog index](https://woseseltops.itch.io/thesapling/devlog), including [announcing 6 devlogs](https://woseseltops.itch.io/thesapling/devlog/248274/announcing-the-next-big-update-in-a-series-of-6-devlogs-on-youtube) and [video devlog 4/6](https://woseseltops.itch.io/thesapling/devlog/257019/video-devlog-46-so-you-guys-wanted-flying-animals). [Paperspace interview](https://blog.paperspace.com/an-evolution-in-gaming/) and [Kinesis Magazine, 2025](https://kinesismagazine.com/2025/06/06/simulating-evolution-from-one-humble-sapling/).

=== END CONTENT ===