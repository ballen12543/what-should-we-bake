import OpenAI from "openai";
import axios from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { mood = "", random = false } = req.body;

    // 1. Mood → structured prefs
    const ai = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Extract baking preferences from: "${mood}".
Return JSON with keys: flavors (array), difficulty, dessertType.`
        }
      ]
    });

    const prefs = JSON.parse(ai.choices[0].message.content);

    // 2. Recipe search
    const recipes = await axios.get(
      "https://api.spoonacular.com/recipes/complexSearch",
      {
        params: {
          apiKey: process.env.SPOON_KEY,
          query: (prefs.flavors || []).join(" "),
          number: 5
        }
      }
    );

    let results = recipes.data.results.map(r => ({
      title: r.title,
      url: `https://spoonacular.com/recipes/${r.title}-${r.id}`
    }));

    if (random) results.sort(() => Math.random() - 0.5);

    res.status(200).json({ recipes: results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}
