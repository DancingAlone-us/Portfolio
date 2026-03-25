import os
import json
from flask import Flask, render_template


app = Flask(__name__, template_folder='templates', static_folder='static', static_url_path="/static")
app.secret_key = 'secret123'

with open(os.path.join(os.path.dirname(__file__),'data.json'),'r') as f:
    portfolio_data = json.load(f)



@app.route('/')
def index():
    return render_template("index.html", data=portfolio_data)

@app.route('/about')
def about():
    return render_template("about.html", data=portfolio_data)

@app.route('/projects')
def projects():
    return render_template("projects.html", data=portfolio_data)

@app.route('/contact')
def contact():
    return render_template("contact.html", data=portfolio_data)

if __name__ == '__main__':
    app.run(debug=True)