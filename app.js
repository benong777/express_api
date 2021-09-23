 
 const express = require('express');
 const bodyParser = require('body-parser');
 const cors = require('cors');
 const mysql = require('mysql2/promise');
 const morgan = require('morgan');
 
 const app = express();

 //-- Display RESET API commands
 app.use(morgan('short'));
 
 //-- Get access to values in the .env file
 //-- Import and load '.env' file
 require('dotenv').config();  // equivalent to lines below
 // const dotenv = require('dotenv');
 // dotenv.config();

 //-- Use process.env to access the variables in '.env' file
 const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
 });

 const port = process.env.PORT;

app.use(async function mysqlConnection(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    //-- Traditional mode ensures not null is respected for unsupplied
    //-- fields, ensures valid JavaScript dates, etc.
    await req.db.query('SET SESSION sql_mode = "TRADITIONAL"');
    await req.db.query(`SET time_zone = '-8:00'`);

    //-- Go to the rest of the middleware until it hits an endpoint 
    await next();

    //-- Returns to here after it finishes the endpoint to release the db connection
    req.db.release();
  } catch(err) {
    //-- If anything downstream throws an error, we must release the 
    //-- connection allocated for the request
    console.log('ERROR detected');
    console.log(err);
    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());
 
app.use(bodyParser.json());

app.get('/cars', async function(req, res) {
  try {
    console.log('GET /cars endpoint');
    const [cars] = await req.db.query("SELECT * FROM cars");
    // res.json({message: "ALL rows returned. ", cars});
    res.json(cars);
  } catch(err) {
    console.log('Error caught - GET request');
  }
})

app.get('/cars/:id', async function(req, res) {
  try {
    console.log('GET /cars/:id endpoint');
    const { id } = req.params;
    const [[cars]] = await req.db.query(
          "SELECT * FROM cars WHERE id = :id", {id});
    // res.json({message: "ALL rows returned. ", cars});
    res.json(cars);
  } catch(err) {
    console.log('Error caught - GET /cars/:id request');
  }
})

app.post('/cars', async function(req, res){
  try {
      const { make, model, deleted_flag } = req.body;
      const [cars] = await req.db.query(
        `INSERT INTO cars ( make, 
                            model, 
                            deleted_flag )
                  VALUES  ( :make, 
                            :model, 
                            :deleted_flag )`,
                          { make, 
                            model, 
                            deleted_flag }
      );
      res.json({message: 'Added car - Make: ' +
          make + ' Model: ' + model, cars});
      
      } catch (err){
          console.log(err)
      }
})

// app.post('/', async function(req,res) {
//     const cars = await req.db.query(
//       `INSERT INTO cars (make, model)
//           VALUES (:make, :model)`, 
//             {
//               make: req.body.make,
//               model: req.body.model
//             }
//     );
//     console.log('cars', cars);
//     res.json(cars);
// });

app.put('/cars/:id', async function(req, res){
  try {
      const { make, model, deleted_flag } = req.body;
      const { id } = req.params;
      const [cars] = await req.db.query(
          `UPDATE cars  SET make = :make, 
                            model = :model,
                            deleted_flag = :deleted_flag
                        WHERE id = :id`, 
                            { 
                              make, 
                              model,
                              deleted_flag, 
                              id 
                            }
      );
      res.json({message: 'Car ID: ' + id + ' has been UPDATED', cars});
  } catch (err){
      console.log(err)
  }
});
 
app.delete('/cars/:id', async function(req, res){
  try {
      const { id } = req.params;
      const [cars] = await req.db.query(
          `UPDATE cars SET deleted_flag = 1 
              WHERE id = :id`, {id}
      );
      res.json({message: 'Car ID: ' + id + ' has been DELETED', cars});
  } catch (err){
      console.log(err)
  }
});
 
 //-- Listen for requests
 app.listen(port, () => console.log(`API Example listening on http://localhost:3000`));
