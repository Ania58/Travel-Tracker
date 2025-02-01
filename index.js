import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

const app = express();
const port = 3000;

dotenv.config();

const db = new pg.Client({
  user: process.env.USER,
  host: process.env.HOST,
  database: process.env.DATABASE,
  password: process.env.PASSWORD,
  port: process.env.PORT,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/", async (req, res) => {
  const result = await db.query("SELECT country_code FROM visited_countries");

  let countries = result.rows.map(row => row.country_code); 

  console.log("GET / - Visited countries:", countries);

  res.render("index.ejs", { countries: countries, total: countries.length });
});


app.post("/add", async (req, res) => {
  const country = req.body.country.toLowerCase();
  console.log("POST /add - Received country:", country);

  try {
    const result = await db.query("SELECT country_name, country_code FROM countries WHERE LOWER(country_name) LIKE LOWER($1)", 
    [`%${country}%`]);

    const matchingCountry = result.rows.find(row => row.country_name.toLowerCase().includes(country));

    if (!matchingCountry) {
      console.log("POST /add - No matching country found.");
      const updatedResult = await db.query("SELECT country_code FROM visited_countries");
      const updatedCountries = updatedResult.rows.map(row => row.country_code);

      return res.render("index.ejs", { 
        countries: updatedCountries, 
        total: updatedCountries.length, 
        error: "Country name does not exist, try again." 
      });
    }

    console.log("POST /add - Matching country found:", matchingCountry);

    try {
      await db.query(
        "INSERT INTO visited_countries(country_code) VALUES($1)",
        [matchingCountry.country_code]
      );

      res.redirect("/");
    } catch (err) {
      console.log("POST /add - Error inserting country:", err);
      const updatedResult = await db.query("SELECT country_code FROM visited_countries");
      const updatedCountries = updatedResult.rows.map(row => row.country_code);

      res.render("index.ejs", { 
        countries: updatedCountries, 
        total: updatedCountries.length, 
        error: "Country has already been added, try again." 
      });
    }

  } catch (err) {
    console.log("POST /add - Database error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});