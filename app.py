import os
import flask as Flask


app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path="/static")
app.secret_key = 'secret123'