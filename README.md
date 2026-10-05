# CHRONICLE

A web-based watch guessing game inspired by Poeltl. Players try to guess a randomly chosen luxury watch using hints from its specifications.

---

## Chronicle Logic

Chronicle is a simple guessing game about luxury watches. Every time you start a game, the system picks one random watch. You make guesses by searching for real watch models, and the game shows you which specifications match and which ones do not.

---

## How the Website Uses the API

The website does not save watch details in its own files. Instead, it gets data from an online FastAPI backend:

1. **Loads All Watches:** When the game starts, the website calls `/api/v1/watches`. It receives the full list of watches and picks one at random to be the secret target.
2. **Search Autocomplete:** When you type in the search bar, the website calls `/api/v1/watches/search?q={text}`. The API looks up matching watches by brand, model, or nickname and shows them in a dropdown list.
3. **API Key Security:** Every request sent to the API includes a special password header (`x-api-key`) so the backend knows the website is allowed to use it.
4. **Checking Your Guess:** When you submit a watch, the code compares your guess to the secret watch across 7 specs:
   - Brand
   - Category
   - Movement
   - Resistance (Water resistance)
   - Size
   - Year
   - Price (PHP)

---

## Game Rules

You have a limited number of guesses to find the secret watch. After each guess, the tiles change color to give you hints:

* **Green:** Exact match.
* **Yellow:** Close number (within a small range).
* **Grey:** Wrong answer or far off.
* **Arrows (↑ / ↓):** Tells you if the secret watch's number (Size, Year, Price, Resistance) is higher or lower than your guess.

---

## Difficulty Modes

* **Easy:** 10 guesses. Shows yellow hints and arrows. You can view the watch silhouette right away.
* **Medium:** 8 guesses. Shows yellow hints and arrows with tighter ranges. The silhouette unlocks after 2 wrong guesses.
* **Hard:** 6 guesses. Shows only green or grey tiles. No yellow hints, no arrows, and no silhouette.

---

## Files in This Project

```text
chronicle/
├── images/       # Watch pictures
├── index.html    # Website layout and popup boxes
├── style.css     # Colors, borders, and button styles
├── script.js     # Game logic and API connection
└── README.md     # Project information