import os
import json
import re
import smtplib
from flask import Flask, render_template, request
from flask_cors import CORS
import mysql.connector
from flask_mail import Mail, Message


def load_env_file(file_path):
    """Load KEY=VALUE pairs into environment variables if not already set."""
    if not os.path.exists(file_path):
        return

    with open(file_path, 'r', encoding='utf-8') as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue

            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


BASE_DIR = os.path.dirname(__file__)
load_env_file(os.path.join(BASE_DIR, '.env'))
load_env_file(os.path.join(BASE_DIR, '.env.example'))


def get_env_value(key, default=''):
    """Read an env var and treat obvious placeholders as missing values."""
    value = os.getenv(key, default)
    if value is None:
        return default

    cleaned = value.strip()
    lowered = cleaned.lower()
    placeholder_markers = ('your-', 'your_', 'your', 'example', 'changeme', 'replace')
    if any(marker in lowered for marker in placeholder_markers):
        return default
    return cleaned


app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path="/static")
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-me')

# ✅ CORS enabled so GitHub Pages frontend can talk to this backend
CORS(app)

with open(os.path.join(BASE_DIR, 'data.json'), 'r', encoding='utf-8') as f:
    portfolio_data = json.load(f)


app.config.update(
    MAIL_SERVER=get_env_value('MAIL_SERVER', 'smtp.gmail.com'),
    MAIL_PORT=int(get_env_value('MAIL_PORT', '587')),
    MAIL_USE_TLS=get_env_value('MAIL_USE_TLS', 'true').lower() == 'true',
    MAIL_USERNAME=get_env_value('MAIL_USERNAME', ''),
    MAIL_PASSWORD=get_env_value('MAIL_PASSWORD', ''),
    MAIL_DEFAULT_SENDER=get_env_value('MAIL_DEFAULT_SENDER', get_env_value('MAIL_USERNAME', '')),
)
mail = Mail(app)


# ✅ Updated to use Railway's variable names
db_config = {
    'host': os.getenv('MYSQLHOST', '127.0.0.1'),
    'user': os.getenv('MYSQLUSER', 'root'),
    'password': os.getenv('MYSQLPASSWORD', ''),
    'database': os.getenv('MYSQLDATABASE', ''),
    'port': int(os.getenv('MYSQLPORT', '3306')),
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

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    status_message = None
    status_type = None

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        subject = request.form.get('subject', '').strip()
        message = request.form.get('message', '').strip()

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
                    if not app.config.get('MAIL_USERNAME') or not app.config.get('MAIL_PASSWORD'):
                        raise ValueError(
                            'MAIL_USERNAME or MAIL_PASSWORD is missing/placeholder in .env'
                        )

                    mail_message = Message(
                        subject=f"New Contact Message: {subject}",
                        recipients=[get_env_value('MAIL_TO_EMAIL', 'drabyahamal.2@gmail.com')],
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
                except smtplib.SMTPAuthenticationError:
                    status_message = (
                        "Your message was saved, but email login failed. "
                        "Check MAIL_USERNAME and Gmail app password in .env."
                    )
                    status_type = "error"
                except smtplib.SMTPException:
                    status_message = (
                        "Your message was saved, but the mail server rejected the request. "
                        "Verify MAIL_SERVER, MAIL_PORT, and TLS settings."
                    )
                    status_type = "error"
                except ValueError as exc:
                    status_message = f"Your message was saved, but email is not configured: {exc}."
                    status_type = "error"
                except Exception:
                    app.logger.exception('Unexpected email send failure')
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
    # ✅ Debug mode off for production
    app.run(debug=False)