from app import app
from models import db, Employee, Engineer, Ticket, TicketNote
from datetime import datetime, timedelta

def seed_database():
    print("Initializing database seeding...")
    
    with app.app_context():
        # Drop all tables and recreate them
        db.drop_all()
        db.create_all()
        
        print("Tables re-created successfully.")
        
        # Seed Employees and Admins
        users_to_seed = [
            {
                'name': 'Shirish (Admin)',
                'email': 'admin@krgtech.com',
                'password': 'adminpassword',
                'department': 'IT Operations',
                'role': 'admin'
            },
            {
                'name': 'Shirish',
                'email': 'shirish@krgtech.com',
                'password': 'password123',
                'department': 'Development',
                'role': 'employee'
            },
            {
                'name': 'Kiran Kumar',
                'email': 'kiran@krgtech.com',
                'password': 'password123',
                'department': 'Human Resources',
                'role': 'employee'
            },
            {
                'name': 'Smitha Rao',
                'email': 'smitha@krgtech.com',
                'password': 'password123',
                'department': 'Marketing',
                'role': 'employee'
            }
        ]
        
        employees_dict = {}
        for u in users_to_seed:
            emp = Employee(
                name=u['name'],
                email=u['email'],
                department=u['department'],
                role=u['role']
            )
            emp.set_password(u['password'])
            db.session.add(emp)
            employees_dict[u['email']] = emp
            
        # Seed Engineers
        engineers_to_seed = [
            {
                'name': 'Rahul Support',
                'email': 'rahul@krgtech.com',
                'password': 'password123',
                'department': 'Network Support'
            },
            {
                'name': 'John Engineer',
                'email': 'john@krgtech.com',
                'password': 'password123',
                'department': 'Hardware Support'
            },
            {
                'name': 'Priya Support',
                'email': 'priya@krgtech.com',
                'password': 'password123',
                'department': 'Software Support'
            }
        ]
        
        engineers_dict = {}
        for eng_data in engineers_to_seed:
            eng = Engineer(
                name=eng_data['name'],
                email=eng_data['email'],
                department=eng_data['department']
            )
            eng.set_password(eng_data['password'])
            db.session.add(eng)
            engineers_dict[eng_data['email']] = eng
            
        db.session.commit()
        print("Employees and Engineers seeded.")

        # Seed Tickets with different statuses, priorities, and dates
        now = datetime.utcnow()
        
        tickets_to_seed = [
            {
                'problem': 'Laptop not connecting to office Wi-Fi',
                'description': 'Unable to access company VPN since morning. The laptop does not detect KRG_Secure network.',
                'priority': 'High',
                'status': 'Open',
                'employee': employees_dict['shirish@krgtech.com'],
                'engineer': None,
                'days_ago': 0,
                'notes': [
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket raised by employee Shirish with High priority.'}
                ]
            },
            {
                'problem': 'Laptop not booting - BSOD Error',
                'description': 'My machine shows a Blue Screen of Death with error code: INACCESSIBLE_BOOT_DEVICE after yesterday\'s Windows update.',
                'priority': 'High',
                'status': 'Assigned',
                'employee': employees_dict['kiran@krgtech.com'],
                'engineer': engineers_dict['john@krgtech.com'],
                'days_ago': 1,
                'notes': [
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket raised by employee Kiran Kumar with High priority.'},
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket assigned to Support Engineer John Engineer by Admin.'}
                ]
            },
            {
                'problem': 'Printer paper jam on Floor 3',
                'description': 'The main network printer on the 3rd floor (near cafeteria) has a paper jam and is showing error code E102.',
                'priority': 'Low',
                'status': 'In Progress',
                'employee': employees_dict['smitha@krgtech.com'],
                'engineer': engineers_dict['rahul@krgtech.com'],
                'days_ago': 2,
                'notes': [
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket raised by employee Smitha Rao with Low priority.'},
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket assigned to Support Engineer Rahul Support by Admin.'},
                    {'author_name': 'Rahul Support', 'author_role': 'engineer', 'content': 'I am looking into this now. I will go to Floor 3 to manually clear the roller jam.'}
                ]
            },
            {
                'problem': 'Requesting PyCharm Pro license key',
                'description': 'Need PyCharm Professional IDE license for Python coding task on KRG internal tools. Manager has approved.',
                'priority': 'Medium',
                'status': 'Resolved',
                'employee': employees_dict['shirish@krgtech.com'],
                'engineer': engineers_dict['priya@krgtech.com'],
                'days_ago': 3,
                'notes': [
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket raised by employee Shirish with Medium priority.'},
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket assigned to Support Engineer Priya Support by Admin.'},
                    {'author_name': 'Priya Support', 'author_role': 'engineer', 'content': 'Approved license key: KRG-PYCH-7781-9923 has been allocated to you. Please register it.'},
                    {'author_name': 'System Log', 'author_role': 'engineer', 'content': 'Status changed from \'Assigned\' to \'Resolved\' by Priya Support.'}
                ]
            },
            {
                'problem': 'Slack desktop app crashing constantly',
                'description': 'My Slack desktop application crashes immediately upon opening. Tried rebooting, still crashes.',
                'priority': 'Medium',
                'status': 'Closed',
                'employee': employees_dict['smitha@krgtech.com'],
                'engineer': engineers_dict['priya@krgtech.com'],
                'days_ago': 4,
                'notes': [
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket raised by employee Smitha Rao with Medium priority.'},
                    {'author_name': 'System Log', 'author_role': 'admin', 'content': 'Ticket assigned to Support Engineer Priya Support by Admin.'},
                    {'author_name': 'Priya Support', 'author_role': 'engineer', 'content': 'Please clear your Slack cache directory under AppData/Roaming/Slack and try again. Alternatively, reinstall Slack.'},
                    {'author_name': 'Smitha Rao', 'author_role': 'employee', 'content': 'Clearing the AppData directory fixed the crash. Thank you!'},
                    {'author_name': 'System Log', 'author_role': 'engineer', 'content': 'Status changed from \'Assigned\' to \'Resolved\' by Priya Support.'},
                    {'author_name': 'System Log', 'author_role': 'employee', 'content': 'Status changed from \'Resolved\' to \'Closed\' by Smitha Rao.'}
                ]
            }
        ]

        for ticket_data in tickets_to_seed:
            ticket_date = now - timedelta(days=ticket_data['days_ago'])
            t = Ticket(
                problem=ticket_data['problem'],
                description=ticket_data['description'],
                priority=ticket_data['priority'],
                status=ticket_data['status'],
                employee_id=ticket_data['employee'].id,
                engineer_id=ticket_data['engineer'].id if ticket_data['engineer'] else None,
                created_at=ticket_date,
                updated_at=ticket_date
            )
            db.session.add(t)
            db.session.flush() # Populate ticket ID before notes
            
            for n_data in ticket_data['notes']:
                n = TicketNote(
                    ticket_id=t.id,
                    author_name=n_data['author_name'],
                    author_role=n_data['author_role'],
                    content=n_data['content'],
                    created_at=ticket_date + timedelta(minutes=15) # Offset a bit
                )
                db.session.add(n)
                
        # Let's seed a few more tickets for the dashboard reports to look richer
        extra_tickets = [
            ('Excel crashing on large files', 'Finance', 'Low', 'Resolved', 5),
            ('VPN MFA reset request', 'Development', 'High', 'Closed', 4),
            ('New monitor request for workspace', 'Development', 'Medium', 'Open', 1),
            ('Outlook email not syncing', 'Marketing', 'Medium', 'Assigned', 2),
            ('Git config authorization failure', 'Development', 'High', 'Resolved', 6),
            ('Keyboard spacebar not responding', 'Human Resources', 'Low', 'Resolved', 7),
            ('Mouse cursor flickering', 'Marketing', 'Low', 'Closed', 10)
        ]
        
        for problem, dept, priority, status, days_ago in extra_tickets:
            # find an employee in that dept, fallback to Shirish
            emp = next((e for e in employees_dict.values() if e.department == dept and e.role != 'admin'), employees_dict['shirish@krgtech.com'])
            # find an engineer
            eng = engineers_dict['rahul@krgtech.com'] if status != 'Open' else None
            
            ticket_date = now - timedelta(days=days_ago)
            t = Ticket(
                problem=problem,
                description=f"Generated description for: {problem} in {dept}.",
                priority=priority,
                status=status,
                employee_id=emp.id,
                engineer_id=eng.id if eng else None,
                created_at=ticket_date,
                updated_at=ticket_date
            )
            db.session.add(t)
            
        db.session.commit()
        print("Tickets and comments seeded successfully!")
        print("Database seeded with total 12 tickets.")

if __name__ == '__main__':
    seed_database()
