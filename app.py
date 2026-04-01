import os
import json
import re
from flask import Flask, render_template, request
import mysql.connector
from flask_mail import Mail, Message


app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path="/static")
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-me')

with open(os.path.join(os.path.dirname(__file__), 'data.json'), 'r', encoding='utf-8') as f:
    portfolio_data = json.load(f)


app.config.update(
    MAIL_SERVER=os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
    MAIL_PORT=int(os.getenv('MAIL_PORT', '587')),
    MAIL_USE_TLS=os.getenv('MAIL_USE_TLS', 'true').lower() == 'true',
    MAIL_USERNAME=os.getenv('MAIL_USERNAME', ''),
    MAIL_PASSWORD=os.getenv('MAIL_PASSWORD', ''),
    MAIL_DEFAULT_SENDER=os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME', '')),
)
mail = Mail(app)



db_config = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'porfolio'),
    'port': int(os.getenv('DB_PORT', '3306')),
}



@app.route('/')
def index():
    return render_template("index.html", data=portfolio_data)

@app.route('/about')
def about():
    return render_template("about.html", data=portfolio_data)

@app.route('/projects')
def projects():
    return render_template("projects.html", data=portfolio_data)

@app.route('/contact', methods = ['GET', 'POST'])
def contact():
    status_message = None
    status_type = None

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email','').strip()
        subject = request.form.get('subject', '').strip()
        message = request.form.get('message','').strip()

        if not all([name, email, subject, message]):
            status_message = "Please fill out all fields before submitting."
            status_type = "error"
        elif not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
            status_message = "Please enter a valid email address."
            status_type = "error"
        else:
            connection = None
            cursor = None
            try:
                connection = mysql.connector.connect(**db_config)
                cursor = connection.cursor()
                insert_query = (
                    "INSERT INTO response (name, email, subject, message) "
                    "VALUES (%s, %s, %s, %s)"
                )
                cursor.execute(insert_query, (name, email, subject, message))
                connection.commit()

                try:
                    mail_message = Message(
                        subject=f"New Contact Message: {subject}",
                        recipients=[os.getenv('MAIL_TO_EMAIL', 'drabyahamal.2@gmail.com')],
                        reply_to=email,
                    )
                    mail_message.body = (
                        f"Name: {name}\n"
                        f"Email: {email}\n"
                        f"Subject: {subject}\n\n"
                        f"Message:\n{message}"
                    )
                    mail.send(mail_message)
                    status_message = "Your message has been saved and emailed successfully."
                    status_type = "success"
                except Exception:
                    status_message = "Your message was saved, but the email could not be sent."
                    status_type = "error"
            except mysql.connector.Error:
                status_message = "Sorry, there was a problem sending your message. Please try again."
                status_type = "error"
            finally:
                if cursor is not None:
                    cursor.close()
                if connection is not None and connection.is_connected():
                    connection.close()

    return render_template(
        "contact.html",
        data=portfolio_data,
        status_message=status_message,
        status_type=status_type
    )

if __name__ == '__main__':
    app.run(debug=True)