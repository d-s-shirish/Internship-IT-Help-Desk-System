import os
from flask import Flask, jsonify, request, session, render_template
from flask_cors import CORS
from config import Config
from models import db, Employee, Engineer, Ticket, TicketNote
from datetime import datetime, timedelta

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for frontend flexibility
CORS(app, supports_credentials=True)

# Initialize database
db.init_app(app)

# Helper function to get current logged in user from session
def get_current_user():
    if 'user_id' not in session:
        return None
    
    role = session.get('role')
    user_id = session.get('user_id')
    
    if role in ['employee', 'admin']:
        user = Employee.query.get(user_id)
        if user:
            return {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'department': user.department,
                'role': user.role
            }
    elif role == 'engineer':
        user = Engineer.query.get(user_id)
        if user:
            return {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'department': user.department,
                'role': 'engineer'
            }
    return None

# Context processor for templates or API health
@app.route('/')
def index():
    return render_template('index.html')

# Authentication API
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Missing credentials'}), 400
        
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    login_type = data.get('role', '') # 'employee', 'admin', 'engineer'
    
    if not email or not password or not login_type:
        return jsonify({'error': 'Email, password, and role selection are required'}), 400
        
    if login_type in ['employee', 'admin']:
        user = Employee.query.filter_by(email=email).first()
        # Verify role matches, or if it is an admin logging in
        if user:
            if login_type == 'admin' and user.role != 'admin':
                return jsonify({'error': 'You do not have administrator privileges'}), 403
            if login_type == 'employee' and user.role == 'admin':
                # Allow admin to login as employee if needed, or enforce role
                pass
                
            if user.check_password(password):
                session['user_id'] = user.id
                session['role'] = user.role
                session['name'] = user.name
                session.permanent = True
                return jsonify({'user': user.to_dict(), 'message': 'Logged in successfully'})
                
    elif login_type == 'engineer':
        user = Engineer.query.filter_by(email=email).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['role'] = 'engineer'
            session['name'] = user.name
            session.permanent = True
            user_data = user.to_dict()
            user_data['role'] = 'engineer'
            return jsonify({'user': user_data, 'message': 'Logged in successfully'})
            
    return jsonify({'error': 'Invalid email, password, or role selection'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
def me():
    user = get_current_user()
    if user:
        return jsonify({'user': user})
    return jsonify({'user': None}), 200

# Tickets API
@app.route('/api/tickets', methods=['GET'])
def get_tickets():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    role = current_user['role']
    user_id = current_user['id']
    
    if role == 'admin':
        tickets = Ticket.query.order_by(Ticket.created_at.desc()).all()
    elif role == 'engineer':
        tickets = Ticket.query.filter_by(engineer_id=user_id).order_by(Ticket.created_at.desc()).all()
    else: # employee
        tickets = Ticket.query.filter_by(employee_id=user_id).order_by(Ticket.created_at.desc()).all()
        
    return jsonify([ticket.to_dict() for ticket in tickets])

@app.route('/api/tickets/<int:ticket_id>', methods=['GET'])
def get_ticket(ticket_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    ticket = Ticket.query.get_or_404(ticket_id)
    
    # Check authorization to view this ticket
    if current_user['role'] == 'employee' and ticket.employee_id != current_user['id']:
        return jsonify({'error': 'Forbidden'}), 403
    if current_user['role'] == 'engineer' and ticket.engineer_id != current_user['id']:
        return jsonify({'error': 'Forbidden'}), 403
        
    # Get notes sorted by created_at ascending
    notes = TicketNote.query.filter_by(ticket_id=ticket.id).order_by(TicketNote.created_at.asc()).all()
    
    ticket_data = ticket.to_dict()
    ticket_data['notes'] = [note.to_dict() for note in notes]
    
    return jsonify(ticket_data)

@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'employee':
        return jsonify({'error': 'Only employees can raise support tickets'}), 403
        
    data = request.get_json()
    if not data or not data.get('problem') or not data.get('description'):
        return jsonify({'error': 'Problem title and description are required'}), 400
        
    priority = data.get('priority', 'Medium')
    if priority not in ['Low', 'Medium', 'High']:
        priority = 'Medium'
        
    ticket = Ticket(
        problem=data.get('problem').strip(),
        description=data.get('description').strip(),
        priority=priority,
        status='Open',
        employee_id=current_user['id']
    )
    
    db.session.add(ticket)
    db.session.commit()
    
    # Add a system note that the ticket was created
    creation_note = TicketNote(
        ticket_id=ticket.id,
        author_name="System Log",
        author_role="admin",
        content=f"Ticket created by {current_user['name']} with {priority} priority."
    )
    db.session.add(creation_note)
    db.session.commit()
    
    return jsonify(ticket.to_dict()), 210

@app.route('/api/tickets/<int:ticket_id>/assign', methods=['POST'])
def assign_ticket(ticket_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Only administrators can assign engineers to tickets'}), 403
        
    data = request.get_json()
    engineer_id = data.get('engineer_id')
    
    ticket = Ticket.query.get_or_404(ticket_id)
    
    if engineer_id:
        engineer = Engineer.query.get(engineer_id)
        if not engineer:
            return jsonify({'error': 'Invalid Engineer selected'}), 400
            
        ticket.engineer_id = engineer.id
        # Update status to Assigned if it was Open
        if ticket.status == 'Open':
            ticket.status = 'Assigned'
            
        # Add system log note
        note = TicketNote(
            ticket_id=ticket.id,
            author_name="System Log",
            author_role="admin",
            content=f"Ticket assigned to Support Engineer {engineer.name} by Admin."
        )
        db.session.add(note)
    else:
        # Unassign engineer
        old_eng_name = ticket.engineer.name if ticket.engineer else "None"
        ticket.engineer_id = None
        ticket.status = 'Open'
        
        note = TicketNote(
            ticket_id=ticket.id,
            author_name="System Log",
            author_role="admin",
            content=f"Ticket unassigned from {old_eng_name} and marked back to Open."
        )
        db.session.add(note)
        
    db.session.commit()
    return jsonify(ticket.to_dict())

@app.route('/api/tickets/<int:ticket_id>/priority', methods=['POST'])
def change_priority(ticket_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Only administrators can change ticket priority'}), 403
        
    data = request.get_json()
    priority = data.get('priority')
    
    if priority not in ['Low', 'Medium', 'High']:
        return jsonify({'error': 'Invalid priority value'}), 400
        
    ticket = Ticket.query.get_or_404(ticket_id)
    old_priority = ticket.priority
    ticket.priority = priority
    
    note = TicketNote(
        ticket_id=ticket.id,
        author_name="System Log",
        author_role="admin",
        content=f"Priority updated from {old_priority} to {priority} by Admin."
    )
    db.session.add(note)
    db.session.commit()
    
    return jsonify(ticket.to_dict())

@app.route('/api/tickets/<int:ticket_id>/status', methods=['PUT', 'POST'])
def update_status(ticket_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    ticket = Ticket.query.get_or_404(ticket_id)
    data = request.get_json()
    new_status = data.get('status')
    
    valid_statuses = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed']
    if new_status not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400
        
    # Role-based restriction on status change
    role = current_user['role']
    
    # Enforce standard workflow permissions
    if role == 'employee':
        # Employee can only close their own ticket if it is Resolved or in progress
        if ticket.employee_id != current_user['id']:
            return jsonify({'error': 'Forbidden'}), 403
        if new_status != 'Closed':
            return jsonify({'error': 'Employees can only change status to Closed'}), 403
            
    elif role == 'engineer':
        # Engineer can only change status of their assigned tickets
        if ticket.engineer_id != current_user['id']:
            return jsonify({'error': 'Forbidden'}), 403
        if new_status == 'Closed' and ticket.status != 'Resolved':
            return jsonify({'error': 'Only employees or admins can close a ticket'}), 403
            
    elif role != 'admin':
        return jsonify({'error': 'Forbidden'}), 403
        
    old_status = ticket.status
    ticket.status = new_status
    
    # Add a system log note
    note = TicketNote(
        ticket_id=ticket.id,
        author_name="System Log",
        author_role=role,
        content=f"Status changed from '{old_status}' to '{new_status}' by {current_user['name']}."
    )
    db.session.add(note)
    db.session.commit()
    
    return jsonify(ticket.to_dict())

@app.route('/api/tickets/<int:ticket_id>/notes', methods=['POST'])
def add_note(ticket_id):
    current_user = get_current_user()
    if not current_user:
        return jsonify({'error': 'Unauthorized'}), 401
        
    ticket = Ticket.query.get_or_404(ticket_id)
    
    # Check permissions
    if current_user['role'] == 'employee' and ticket.employee_id != current_user['id']:
        return jsonify({'error': 'Forbidden'}), 403
    if current_user['role'] == 'engineer' and ticket.engineer_id != current_user['id']:
        return jsonify({'error': 'Forbidden'}), 403
        
    data = request.get_json()
    content = data.get('content', '').strip()
    
    if not content:
        return jsonify({'error': 'Note content cannot be empty'}), 400
        
    note = TicketNote(
        ticket_id=ticket.id,
        author_name=current_user['name'],
        author_role=current_user['role'],
        content=content
    )
    
    db.session.add(note)
    db.session.commit()
    
    return jsonify(note.to_dict()), 201

# Admin Management API
@app.route('/api/engineers', methods=['GET'])
def get_engineers():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    engineers = Engineer.query.order_by(Engineer.name.asc()).all()
    return jsonify([eng.to_dict() for eng in engineers])

@app.route('/api/employees', methods=['GET'])
def get_employees():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    employees = Employee.query.order_by(Employee.name.asc()).all()
    return jsonify([emp.to_dict() for emp in employees])

@app.route('/api/admin/employees', methods=['POST'])
def add_employee():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    department = data.get('department', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'employee')
    
    if not name or not email or not department or not password:
        return jsonify({'error': 'All fields are required'}), 400
        
    # Check if user already exists
    if Employee.query.filter_by(email=email).first() or Engineer.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already in use'}), 400
        
    employee = Employee(
        name=name,
        email=email,
        department=department,
        role=role
    )
    employee.set_password(password)
    
    db.session.add(employee)
    db.session.commit()
    
    return jsonify(employee.to_dict()), 201

@app.route('/api/admin/engineers', methods=['POST'])
def add_engineer():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    department = data.get('department', '').strip()
    password = data.get('password', '').strip()
    
    if not name or not email or not department or not password:
        return jsonify({'error': 'All fields are required'}), 400
        
    # Check if email exists
    if Employee.query.filter_by(email=email).first() or Engineer.query.filter_by(email=email).first():
        return jsonify({'error': 'Email is already in use'}), 400
        
    engineer = Engineer(
        name=name,
        email=email,
        department=department
    )
    engineer.set_password(password)
    
    db.session.add(engineer)
    db.session.commit()
    
    return jsonify(engineer.to_dict()), 201

@app.route('/api/admin/employees/<int:emp_id>', methods=['DELETE'])
def delete_employee(emp_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    if emp_id == current_user['id']:
        return jsonify({'error': 'You cannot delete your own admin account'}), 400
        
    employee = Employee.query.get_or_404(emp_id)
    db.session.delete(employee)
    db.session.commit()
    return jsonify({'message': 'Employee deleted successfully'})

@app.route('/api/admin/engineers/<int:eng_id>', methods=['DELETE'])
def delete_engineer(eng_id):
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    engineer = Engineer.query.get_or_404(eng_id)
    
    # Reassign this engineer's tickets to None and set back to Open or Assigned status
    tickets = Ticket.query.filter_by(engineer_id=engineer.id).all()
    for ticket in tickets:
        ticket.engineer_id = None
        ticket.status = 'Open'
        # Log note
        note = TicketNote(
            ticket_id=ticket.id,
            author_name="System Log",
            author_role="admin",
            content=f"Ticket unassigned because Support Engineer {engineer.name} was removed from system."
        )
        db.session.add(note)
        
    db.session.delete(engineer)
    db.session.commit()
    return jsonify({'message': 'Engineer deleted successfully'})

# Dashboard / Reports API
@app.route('/api/admin/reports', methods=['GET'])
def get_reports():
    current_user = get_current_user()
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
        
    # Get counts for today's tickets
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    total_tickets = Ticket.query.count()
    tickets_today = Ticket.query.filter(Ticket.created_at >= today_start).count()
    
    resolved_tickets = Ticket.query.filter(Ticket.status == 'Resolved').count()
    closed_tickets = Ticket.query.filter(Ticket.status == 'Closed').count()
    pending_tickets = Ticket.query.filter(Ticket.status.in_(['Open', 'Assigned', 'In Progress'])).count()
    
    high_priority = Ticket.query.filter(Ticket.status != 'Closed', Ticket.priority == 'High').count()
    medium_priority = Ticket.query.filter(Ticket.status != 'Closed', Ticket.priority == 'Medium').count()
    low_priority = Ticket.query.filter(Ticket.status != 'Closed', Ticket.priority == 'Low').count()
    
    # Tickets by department of the employee who raised them
    dept_counts = {}
    departments = db.session.query(Employee.department, db.func.count(Ticket.id)).\
        join(Ticket, Ticket.employee_id == Employee.id).\
        group_by(Employee.department).all()
    for dept, count in departments:
        dept_counts[dept] = count
        
    # Tickets by status
    status_counts = {
        'Open': Ticket.query.filter_by(status='Open').count(),
        'Assigned': Ticket.query.filter_by(status='Assigned').count(),
        'In Progress': Ticket.query.filter_by(status='In Progress').count(),
        'Resolved': Ticket.query.filter_by(status='Resolved').count(),
        'Closed': Ticket.query.filter_by(status='Closed').count()
    }
    
    # Simple recent ticket count per day (last 7 days)
    tickets_last_7_days = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = Ticket.query.filter(Ticket.created_at >= day_start, Ticket.created_at <= day_end).count()
        tickets_last_7_days.append({
            'date': day.strftime('%b %d'),
            'count': count
        })

    # Engineer workload (assigned non-closed tickets)
    engineers = Engineer.query.all()
    eng_workload = []
    for eng in engineers:
        active_count = Ticket.query.filter(Ticket.engineer_id == eng.id, Ticket.status != 'Closed').count()
        eng_workload.append({
            'name': eng.name,
            'active_tickets': active_count
        })

    return jsonify({
        'summary': {
            'totalTickets': total_tickets,
            'ticketsToday': tickets_today,
            'resolved': resolved_tickets,
            'closed': closed_tickets,
            'pending': pending_tickets,
            'highPriority': high_priority,
            'mediumPriority': medium_priority,
            'lowPriority': low_priority
        },
        'statusCounts': status_counts,
        'departmentCounts': dept_counts,
        'dailyTrend': tickets_last_7_days,
        'engineerWorkload': eng_workload
    })

if __name__ == '__main__':
    # Initialize the database on startup
    with app.app_context():
        db.create_all()
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
