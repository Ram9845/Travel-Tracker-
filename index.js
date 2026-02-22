import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user : "postgres",
  password : "passkalla",
  host : "localhost",
  port : 5432,
  database : "world"
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function visitedCountries(){
  const result =  await db.query("SELECT country_code FROM visited_countries");
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  const total = countries.length;
  return {countries, total};
};

async function addCountries(countryCode) {
  let duplicate = false;
  try {
    await db.query(
      "INSERT INTO visited_countries (country_code) VALUES ($1)",
      [countryCode]
    );
  } catch (err) {
    if (err.code === "23505") {
      duplicate = true;   
    } else {
      throw err;          
    }
  }
  const { countries, total } = await visitedCountries();
  return { countries, total, duplicate };
};

app.get("/", async (req, res) => {
 
  const {countries, total} = await visitedCountries();
    
  res.render("index.ejs" , {countries:countries , total:total});
  // db.end();
});

app.post("/add" , async(req,res)=>{
  const countryAdded = req.body.country;
  
    const result = await db.query("SELECT country_code FROM countries WHERE country_name ILIKE '%'||$1||'%'" , [countryAdded]);
    if (result.rows.length != 0){
      console.log(result.rows[0].country_code);
      const countryCode = result.rows[0].country_code;
      const {countries, total , duplicate} = await addCountries(countryCode);
      if (duplicate) {
        const error = "Country has already been added, try again.";
        res.render("index.ejs", {countries: countries, total: total, error: error});
      } else {
        res.render("index.ejs", {countries: countries, total: total});
      }
    } else {
      const {countries, total} = await visitedCountries();
      res.render("index.ejs", {countries: countries, total: total, error: "Country not found, try again."});  
    }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
