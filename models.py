from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Employee(db.Model):
    __tablename__ = 'employees'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='employee', nullable=False) # 'employee', 'admin'
    
    # Relationships
    tickets = db.relationship('Ticket', backref='employee', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'department': self.department,
            'email': self.email,
            'role': self.role
        }

class Engineer(db.Model):
    __tablename__ = 'engineers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Relationships
    tickets = db.relationship('Ticket', backref='engineer', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'department': self.department,
            'email': self.email
        }

class Ticket(db.Model):
    __tablename__ = 'tickets'
    
    id = db.Column(db.Integer, primary_key=True)
    problem = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default='Medium', nullable=False) # 'Low', 'Medium', 'High'
    status = db.Column(db.String(20), default='Open', nullable=False) # 'Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'
    
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    engineer_id = db.Column(db.Integer, db.ForeignKey('engineers.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    notes = db.relationship('TicketNote', backref='ticket', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'problem': self.problem,
            'description': self.description,
            'priority': self.priority,
            'status': self.status,
            'employee_id': self.employee_id,
            'employee_name': self.employee.name if self.employee else None,
            'employee_dept': self.employee.department if self.employee else None,
            'engineer_id': self.engineer_id,
            'engineer_name': self.engineer.name if self.engineer else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class TicketNote(db.Model):
    __tablename__ = 'ticket_notes'
    
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    author_name = db.Column(db.String(100), nullable=False)
    author_role = db.Column(db.String(20), nullable=False) # 'employee', 'admin', 'engineer'
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'ticket_id': self.ticket_id,
            'author_name': self.author_name,
            'author_role': self.author_role,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }
