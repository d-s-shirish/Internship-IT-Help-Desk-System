# KRG IT Help Desk System

A Flask-based help desk and ticket management application for internal IT support operations. The platform allows employees to raise support tickets, administrators to manage users and assignments, and engineers to update the lifecycle of tickets.

## Features

- Employee login and authentication
- Admin dashboard for ticket and user management
- Engineer view for assigned tickets
- Ticket creation, assignment, priority updates, and status tracking
- Notes/comments on each ticket
- Dashboard reports for ticket metrics and workload
- SQLite default database with optional MySQL configuration

## Tech Stack

- Python
- Flask
- Flask-SQLAlchemy
- Flask-CORS
- SQLite (default)
- MySQL (optional via environment variables)

## Project Structure

- `app.py` – Flask app and API routes
- `config.py` – App configuration and database settings
- `models.py` – Database models for users, tickets, and notes
- `seed.py` – Demo data seeding for employees, engineers, and tickets
- `templates/` – Frontend HTML templates
- `static/` – CSS and JavaScript assets
- `instance/` – Local app instance data

## Prerequisites

- Python 3.9+
- pip

## Setup

1. Open a terminal in the project folder.
2. Create and activate a virtual environment:

```bash
python -m venv .venv
```

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install flask flask-sqlalchemy flask-cors pymysql
```

## Run the Application

Start the app:

```bash
python app.py
```

The app will run at:

```text
http://localhost:5000
```

## Database

By default, the app uses SQLite:

```text
sqlite:///krg_helpdesk.db
```

If you want to use MySQL instead, set the following environment variables before running the app:

```bash
set MYSQL_USER=your_username
set MYSQL_PASSWORD=your_password
set MYSQL_DB=your_database
set MYSQL_HOST=localhost
```

You may also set `DATABASE_URL` manually if needed.

## Seed Demo Data

To populate the database with sample employees, engineers, and tickets:

```bash
python seed.py
```

This script recreates the database and inserts demo records.

## Default Login Accounts

The seeded demo accounts are:

- Admin
  - Email: `admin@krgtech.com`
  - Password: `adminpassword`

- Employee
  - Email: `shirish@krgtech.com`
  - Password: `password123`

- Employee
  - Email: `kiran@krgtech.com`
  - Password: `password123`

- Employee
  - Email: `smitha@krgtech.com`
  - Password: `password123`

- Engineer
  - Email: `rahul@krgtech.com`
  - Password: `password123`

- Engineer
  - Email: `john@krgtech.com`
  - Password: `password123`

- Engineer
  - Email: `priya@krgtech.com`
  - Password: `password123`

## Notes

- The app uses session-based authentication.
- Admin users can assign engineers and manage employees.
- Engineers can only work on their assigned tickets.
- Employees can raise and close their own tickets.

## License

This project is for educational/internal use and is not currently licensed for commercial distribution.
