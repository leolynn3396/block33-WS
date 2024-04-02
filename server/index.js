const express = require('express')
const app = express()
const pg = require('pg')
const path = require('path');

const client = new pg.Client(
  process.env.DATABASE_URL || 'postgres://localhost/acme_hr_directory' //// static routes here (you only need these for deployment)
)

app.use(express.json());
app.use(require('morgan')('dev'));


// app routes here
app.get('/api/employees', async (req, res, next) => {
    try {
        const SQL = `
        SELECT * from employees;
      `
        const result = await client.query(SQL)
        res.send(result.rows)
    } catch (error) {
        next(error)
    }
});
app.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = `
        SELECT * from departments;
      `
        const result = await client.query(SQL)
        res.send(result.rows)
    } catch (error) {
        next(error)
    }
});
app.post('/api/employees', async (req, res, next) => {
    try {
        const SQL = `INSERT INTO employees(name, department_id)
        VALUES ($1, (SELECT id FROM departments WHERE name=$2))
        RETURNING *`
        const result = await client.query(SQL, [req.body.name, req.body.departmentName])
        res.send(result.rows[0])
    } catch (error) {
        next(error)
    }
});
app.delete('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = `
        DELETE FROM employees
        WHERE id = $1;
      `
        const response = await client.query(SQL, [req.params.id])
        res.sendStatus(204)
    } catch (error) {
        next(error)
    }
});
app.put('/api/employees/:id', async (req, res, next) => {
    try {
        const SQL = `UPDATE employees
        SET name = $1, department_id = (SELECT id FROM departments WHERE name=$2), updated_at=now()
        WHERE id = $3 RETURNING *`
        const result = await client.query(SQL, [req.body.name, req.body.departmentName, req.params.id])
        res.send(result.rows[0])
    } catch (error) {
        next(error)
    }
});

// create your init function
const init = async () => {
    await client.connect();
    console.log('connected to database')
    let SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS departments;

    CREATE TABLE departments(
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL);
    
    CREATE TABLE employees(
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES departments(id) NOT NULL);
    `
    await client.query(SQL)
    console.log('tables created')
    
    SQL = ` 
    INSERT INTO departments(name) VALUES('Human Resources');
    INSERT INTO departments(name) VALUES('Accounting');
    INSERT INTO departments(name) VALUES('Information Technology');
    
    INSERT INTO employees(name, department_id) VALUES('Mary Jones', (SELECT id FROM departments WHERE name='Human Resources'));
    INSERT INTO employees(name, department_id) VALUES('Deon Cameron', (SELECT id FROM departments WHERE name='Human Resources'));
    INSERT INTO employees(name, department_id) VALUES('America Mitchell', (SELECT id FROM departments WHERE name='Accounting'));
    INSERT INTO employees(name, department_id) VALUES('Troy Conway', (SELECT id FROM departments WHERE name='Information Technology'));
    INSERT INTO employees(name, department_id) VALUES('Jayleen Kaiser', (SELECT id FROM departments WHERE name='Information Technology'));`;
    await client.query(SQL);
    console.log('data seeded');

    const port = process.env.PORT || 3000
    app.listen(port, () => console.log(`listening on port ${port}`))

}
// init function invocation
init()