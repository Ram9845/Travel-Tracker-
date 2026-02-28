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
  database : "travel"
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [
  { id: 1, name: "Angela", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

console.log(users.id);

async function checkVisisted() {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id WHERE user_id = $1; ",
    [currentUserId]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  // const countries = result.rows.map(row => row.country_code);
  return countries;
}


async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  // console.log(result.rows);
  users = result.rows;
  // console.log(users);
  const user = users.find((user) => user.id == currentUserId) || users[0];
  // console.log("CURRENT USER:", user);
  return user;
//   console.log(typeof(currentUserId));
//   console.log(typeof(users));
}

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await getCurrentUser();
  // console.log( currentUser.color);
  const color = currentUser?.color || "teal";
  
  // console.log("ACTIVE USER:", currentUserId);
  // console.log("COUNTRIES SENT TO UI:", countries);
  res.render("index.ejs", {
    countries: countries,   
    total: countries.length,
    users: users,
    color: color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"]?.trim();
  const currentUser = await getCurrentUser();
  const isDelete = req.body.action === "delete";

  if (!input) return res.redirect("/");

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    if (result.rows.length === 0) {
    return res.redirect("/"); 
    }
    const countryCode = result.rows[0].country_code;
    try {
      if (isDelete) {
        await db.query(
          "DELETE FROM visited_countries WHERE country_code = $1 AND user_id = $2;",
          [countryCode, currentUserId]
        );
      } else {
        await db.query(
          "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
          [countryCode, currentUserId]
        );
      }
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
   
   currentUserId = parseInt(req.body.user, 10);
    res.redirect("/");
  }
});


app.post("/new", async (req, res) => {
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  const id = parseInt(result.rows[0].id);
  currentUserId = id;

  res.redirect("/");
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
