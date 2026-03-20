from flask import Flask, jsonify, request, send_file
from dotenv import load_dotenv
load_dotenv()
import os
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings, os, requests as req
from datetime import timedelta, datetime
warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, '..', 'database', 'enercast.db')
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

app.config['SQLALCHEMY_DATABASE_URI']        = f"sqlite:///{DB_PATH}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY']                 = os.getenv('JWT_SECRET_KEY', 'enercast-secret-key-2025')
app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(hours=24)

db  = SQLAlchemy(app)
jwt    = JWTManager(app)
bcrypt  = Bcrypt(app)
limiter = Limiter(get_remote_address, app=app, default_limits=['200 per day', '50 per hour'])

class User(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80),  unique=True, nullable=False)
    email    = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_admin  = db.Column(db.Boolean, default=False)

class SavedForecast(db.Model):
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    country    = db.Column(db.String(100), nullable=False)
    metric     = db.Column(db.String(100), nullable=False)
    model_used = db.Column(db.String(50),  nullable=False)
    created_at = db.Column(db.String(50),  nullable=False)

DATA_PATH = os.path.join(BASE_DIR, 'data', 'owid-energy-data.csv')
try:
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset loaded: {df.shape[0]} rows")
except Exception as e:
    print(f"Dataset error: {e}")
    df = pd.DataFrame()

def get_valid_countries():
    if df.empty: return []
    counts = df.groupby('country')['primary_energy_consumption'].count()
    return sorted(counts[counts >= 5].index.tolist())

def prepare_series(country, metric):
    cdf = df[df['country'] == country].sort_values('year')
    return cdf[['year', metric]].dropna().reset_index(drop=True)

def calc_metrics(actual, predicted):
    actual = np.array(actual, dtype=float)
    predicted = np.array(predicted, dtype=float)
    mae  = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    mape = np.mean(np.abs((actual - predicted) / (np.abs(actual) + 1e-9))) * 100
    return round(float(mae),2), round(float(rmse),2), round(float(mape),2)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'EnerCast API running!', 'rows': len(df)})

@app.route('/api/countries', methods=['GET'])
def countries():
    return jsonify({'countries': get_valid_countries()})

@app.route('/api/metrics', methods=['GET'])
def metrics():
    return jsonify({'metrics': {
        'primary_energy_consumption': 'Primary Energy Consumption (TWh)',
        'electricity_demand': 'Electricity Demand (TWh)',
        'fossil_fuel_consumption': 'Fossil Fuel Consumption (TWh)',
        'renewables_consumption': 'Renewables Consumption (TWh)',
        'coal_consumption': 'Coal Consumption (TWh)',
        'oil_consumption': 'Oil Consumption (TWh)',
        'gas_consumption': 'Gas Consumption (TWh)',
    }})

@app.route('/api/auth/register', methods=['POST', 'OPTIONS'])
@limiter.limit('5 per minute')
def register():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        data = request.get_json()
        username = data.get('username','').strip()
        email    = data.get('email','').strip()
        password = data.get('password','').strip()
        if not username or not email or not password:
            return jsonify({'error': 'All fields required'}), 400
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already exists'}), 400
        hashed = bcrypt.generate_password_hash(password).decode("utf-8")
        user = User(username=username, email=email, password=hashed)
        db.session.add(user); db.session.commit()
        token = create_access_token(identity=str(user.id))
        return jsonify({'message': 'Registered!', 'token': token, 'username': username}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
@limiter.limit('10 per minute')
def login():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        data = request.get_json()
        username = data.get('username','').strip()
        password = data.get('password','').strip()
        user = User.query.filter_by(username=username).first()
        if not user or not bcrypt.check_password_hash(user.password, password):
            return jsonify({'error': 'Invalid credentials'}), 401
        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'username': user.username}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        saved = SavedForecast.query.filter_by(user_id=user_id).all()
        return jsonify({'username': user.username, 'email': user.email,
                        'saved_forecasts': [{'country':s.country,'metric':s.metric,'model':s.model_used,'date':s.created_at} for s in saved]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/stats', methods=['GET'])
@jwt_required()
def user_stats():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        saved = SavedForecast.query.filter_by(user_id=user_id).all()
        from collections import Counter
        countries = [s.country for s in saved]
        metrics_list = [s.metric for s in saved]
        fav_country = Counter(countries).most_common(1)[0][0] if countries else 'N/A'
        fav_metric  = Counter(metrics_list).most_common(1)[0][0] if metrics_list else 'N/A'
        return jsonify({'username': user.username, 'email': user.email,
                        'total_saved': len(saved), 'fav_country': fav_country, 'fav_metric': fav_metric,
                        'recent': [{'id':s.id,'country':s.country,'metric':s.metric,'model':s.model_used,'date':s.created_at} for s in saved[-5:][::-1]],
                        'all_forecasts': [{'id':s.id,'country':s.country,'metric':s.metric,'model':s.model_used,'date':s.created_at} for s in saved[::-1]]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        user = User.query.get(user_id)
        if user.password != data.get('old_password',''):
            return jsonify({'error': 'Current password incorrect'}), 401
        user.password = data.get('new_password','')
        db.session.commit()
        return jsonify({'message': 'Password changed!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast/save', methods=['POST'])
@jwt_required()
def save_forecast():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        sf = SavedForecast(user_id=user_id, country=data['country'], metric=data['metric'],
                           model_used=data['model'], created_at=datetime.now().strftime('%Y-%m-%d %H:%M'))
        db.session.add(sf); db.session.commit()
        return jsonify({'message': 'Saved!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast/delete/<int:forecast_id>', methods=['DELETE'])
@jwt_required()
def delete_forecast(forecast_id):
    try:
        user_id = int(get_jwt_identity())
        sf = SavedForecast.query.filter_by(id=forecast_id, user_id=user_id).first()
        if not sf: return jsonify({'error': 'Not found'}), 404
        db.session.delete(sf); db.session.commit()
        return jsonify({'message': 'Deleted!'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/energy-mix', methods=['GET'])
def energy_mix():
    country = request.args.get('country', 'India')
    try:
        cdf = df[df['country'] == country].sort_values('year')
        mix_cols = ['coal_consumption','oil_consumption','gas_consumption','nuclear_consumption','hydro_consumption','solar_consumption','wind_consumption','biofuel_consumption']
        mix_df = cdf[cdf['year'] >= 1990][['year'] + mix_cols].fillna(0)
        result = {col: mix_df[col].tolist() for col in mix_cols}
        result['years'] = mix_df['year'].tolist()
        latest = cdf.dropna(subset=['coal_consumption'])
        pie = {}
        if len(latest) > 0:
            latest = latest.iloc[-1]
            labels = ['Coal','Oil','Gas','Nuclear','Hydro','Solar','Wind','Biofuel']
            for label, col in zip(labels, mix_cols):
                val = latest.get(col, 0)
                if pd.notna(val) and val > 0: pie[label] = round(float(val), 2)
        result['pie'] = pie
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/gdp-population', methods=['GET'])
def gdp_population():
    country = request.args.get('country', 'India')
    try:
        cdf = df[df['country'] == country].sort_values('year')
        data = cdf[['year','gdp','population']].dropna()
        return jsonify({'years': data['year'].tolist(), 'gdp': data['gdp'].tolist(), 'population': data['population'].tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/insights', methods=['GET'])
def insights():
    country = request.args.get('country', 'India')
    metric  = request.args.get('metric', 'primary_energy_consumption')
    try:
        series = prepare_series(country, metric)
        cdf = df[df['country'] == country].sort_values('year')
        vals = np.array(series[metric].values, dtype=float)
        cagr = ((vals[-1] / vals[0]) ** (1 / len(vals)) - 1) * 100
        renew_df  = cdf[['year','renewables_share_energy']].dropna()
        fossil_df = cdf[['year','fossil_share_energy']].dropna()
        gdp_df    = cdf[['year','gdp','population']].dropna()
        renew_latest  = float(renew_df.iloc[-1]['renewables_share_energy'])  if len(renew_df)  > 0 else None
        fossil_latest = float(fossil_df.iloc[-1]['fossil_share_energy'])     if len(fossil_df) > 0 else None
        gdp_latest    = float(gdp_df.iloc[-1]['gdp'])        if len(gdp_df) > 0 else None
        pop_latest    = float(gdp_df.iloc[-1]['population']) if len(gdp_df) > 0 else None
        recs = []
        if fossil_latest and fossil_latest > 70: recs.append({'type':'alert','text':f'High fossil dependency ({fossil_latest:.0f}%). Transition to renewables.'})
        if renew_latest  and renew_latest  < 20: recs.append({'type':'warning','text':f'Low renewables ({renew_latest:.0f}%). Solar/wind could cut costs 15-30%.'})
        if cagr > 2: recs.append({'type':'warning','text':f'Fast growth ({cagr:.1f}%/yr). Implement demand-side management.'})
        if renew_latest  and renew_latest  > 30: recs.append({'type':'success','text':f'Good renewables share ({renew_latest:.0f}%). Keep investing!'})
        return jsonify({'cagr': round(float(cagr),2), 'latest_value': round(float(vals[-1]),2),
                        'renew_share': renew_latest, 'fossil_share': fossil_latest,
                        'gdp': gdp_latest, 'population': pop_latest, 'recommendations': recs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/anomalies', methods=['GET'])
def anomalies():
    country = request.args.get('country', 'India')
    metric  = request.args.get('metric', 'primary_energy_consumption')
    try:
        series = prepare_series(country, metric)
        vals = np.array(series[metric].values, dtype=float)
        yrs  = np.array(series['year'].values)
        s = pd.Series(vals)
        roll_mean = s.rolling(5, center=True).mean().bfill().ffill()
        roll_std  = s.rolling(5, center=True).std().bfill().ffill()
        z_score   = (pd.Series(vals) - roll_mean) / (roll_std + 1e-9)
        anom_mask = np.abs(z_score) > 1.8
        return jsonify({'years': yrs.tolist(), 'values': vals.tolist(),
                        'roll_mean': roll_mean.tolist(), 'upper_band': (roll_mean+2*roll_std).tolist(),
                        'lower_band': (roll_mean-2*roll_std).tolist(),
                        'anomaly_years': yrs[anom_mask.values].astype(int).tolist(),
                        'anomaly_values': vals[anom_mask.values].tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/compare-countries', methods=['GET'])
def compare_countries():
    c1 = request.args.get('country1', 'India')
    c2 = request.args.get('country2', 'China')
    metric = request.args.get('metric', 'primary_energy_consumption')
    try:
        def get_country_data(country):
            series = prepare_series(country, metric)
            vals = np.array(series[metric].values, dtype=float)
            yrs  = np.array(series['year'].values)
            cagr = ((vals[-1] / vals[0]) ** (1 / len(vals)) - 1) * 100
            cdf  = df[df['country'] == country].sort_values('year')
            renew  = cdf[['year','renewables_share_energy']].dropna()
            fossil = cdf[['year','fossil_share_energy']].dropna()
            return {'years': yrs.tolist(), 'values': vals.tolist(), 'latest': round(float(vals[-1]),2),
                    'cagr': round(float(cagr),2),
                    'renew_share':  float(renew.iloc[-1]['renewables_share_energy'])  if len(renew)  > 0 else None,
                    'fossil_share': float(fossil.iloc[-1]['fossil_share_energy'])     if len(fossil) > 0 else None}
        return jsonify({'metric': metric, 'country1': {'name':c1,**get_country_data(c1)}, 'country2': {'name':c2,**get_country_data(c2)}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/forecast/arima', methods=['GET'])
def forecast_arima():
    country    = request.args.get('country', 'India')
    metric     = request.args.get('metric', 'primary_energy_consumption')
    fc_years_n = int(request.args.get('years', 7))
    p = int(request.args.get('p', 2))
    d = int(request.args.get('d', 1))
    q = int(request.args.get('q', 2))
    try:
        series = prepare_series(country, metric)
        if len(series) < 5: return jsonify({'error': 'Not enough data'}), 400
        vals = np.array(series[metric].values, dtype=float)
        yrs  = np.array(series['year'].values)
        split = int(len(vals) * 0.8)
        m_eval = ARIMA(vals[:split], order=(p,d,q)).fit()
        pred   = np.array(m_eval.get_forecast(steps=len(vals)-split).predicted_mean).flatten()
        mae, rmse, mape = calc_metrics(vals[split:], pred)
        m_full  = ARIMA(vals, order=(p,d,q)).fit()
        fc_obj  = m_full.get_forecast(steps=fc_years_n)
        fc_mean = np.array(fc_obj.predicted_mean).flatten()
        fc_ci   = np.array(fc_obj.conf_int(alpha=0.2))
        fc_yrs  = list(range(int(yrs[-1])+1, int(yrs[-1])+fc_years_n+1))
        fitted  = np.array(m_full.fittedvalues).flatten()
        return jsonify({'model':'ARIMA', 'historical_years':yrs.tolist(), 'historical_values':vals.tolist(),
                        'fitted_values':fitted.tolist(), 'forecast_years':fc_yrs, 'forecast_values':fc_mean.tolist(),
                        'lower_bound':fc_ci[:,0].flatten().tolist(), 'upper_bound':fc_ci[:,1].flatten().tolist(),
                        'metrics':{'mae':mae,'rmse':rmse,'mape':mape,'aic':round(float(m_full.aic),2)},
                        'test_years':yrs[split:].tolist(), 'test_values':vals[split:].tolist(), 'pred_values':pred.tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast/linear', methods=['GET'])
def forecast_linear():
    country    = request.args.get('country', 'India')
    metric     = request.args.get('metric', 'primary_energy_consumption')
    fc_years_n = int(request.args.get('years', 7))
    try:
        series = prepare_series(country, metric)
        if len(series) < 5: return jsonify({'error': 'Not enough data'}), 400
        vals  = np.array(series[metric].values, dtype=float)
        yrs   = np.array(series['year'].values).reshape(-1,1)
        split = int(len(vals) * 0.8)
        model = LinearRegression()
        model.fit(yrs[:split], vals[:split])
        pred  = model.predict(yrs[split:])
        mae, rmse, mape = calc_metrics(vals[split:], pred)
        model.fit(yrs, vals)
        last_yr = int(series['year'].iloc[-1])
        fc_yrs  = list(range(last_yr+1, last_yr+fc_years_n+1))
        fc_mean = model.predict(np.array(fc_yrs).reshape(-1,1))
        fitted  = model.predict(yrs).flatten()
        std     = np.std(vals - fitted)
        return jsonify({'model':'Linear Regression', 'historical_years':yrs.flatten().tolist(), 'historical_values':vals.tolist(),
                        'fitted_values':fitted.tolist(), 'forecast_years':fc_yrs, 'forecast_values':fc_mean.tolist(),
                        'lower_bound':(fc_mean-1.28*std).tolist(), 'upper_bound':(fc_mean+1.28*std).tolist(),
                        'metrics':{'mae':mae,'rmse':rmse,'mape':mape,'aic':None},
                        'test_years':yrs[split:].flatten().tolist(), 'test_values':vals[split:].tolist(), 'pred_values':pred.tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast/randomforest', methods=['GET'])
def forecast_rf():
    country    = request.args.get('country', 'India')
    metric     = request.args.get('metric', 'primary_energy_consumption')
    fc_years_n = int(request.args.get('years', 7))
    try:
        series = prepare_series(country, metric)
        if len(series) < 5: return jsonify({'error': 'Not enough data'}), 400
        vals = np.array(series[metric].values, dtype=float)
        yrs  = np.array(series['year'].values)
        def make_features(y, yr):
            X = []
            for i in range(2, len(y)): X.append([yr[i], y[i-1], y[i-2]])
            return np.array(X), y[2:]
        X, y_clean = make_features(vals, yrs)
        split2 = int(len(X) * 0.8)
        model  = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X[:split2], y_clean[:split2])
        pred = model.predict(X[split2:])
        mae, rmse, mape = calc_metrics(y_clean[split2:], pred)
        model.fit(X, y_clean)
        fitted_full = [None, None] + model.predict(X).tolist()
        last_yr = int(yrs[-1])
        fc_yrs  = list(range(last_yr+1, last_yr+fc_years_n+1))
        fc_mean = []
        prev1, prev2 = vals[-1], vals[-2]
        for yr in fc_yrs:
            pv = float(model.predict([[yr, prev1, prev2]])[0])
            fc_mean.append(pv); prev2, prev1 = prev1, pv
        fc_mean = np.array(fc_mean)
        std = np.std(y_clean - model.predict(X))
        return jsonify({'model':'Random Forest', 'historical_years':yrs.tolist(), 'historical_values':vals.tolist(),
                        'fitted_values':fitted_full, 'forecast_years':fc_yrs, 'forecast_values':fc_mean.tolist(),
                        'lower_bound':(fc_mean-1.28*std).tolist(), 'upper_bound':(fc_mean+1.28*std).tolist(),
                        'metrics':{'mae':mae,'rmse':rmse,'mape':mape,'aic':None},
                        'test_years':yrs[split2+2:].tolist(), 'test_values':y_clean[split2:].tolist(), 'pred_values':pred.tolist()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forecast/lstm', methods=['GET'])
def forecast_lstm():
    country    = request.args.get('country', 'India')
    metric     = request.args.get('metric', 'primary_energy_consumption')
    fc_years_n = int(request.args.get('years', 7))
    try:
        series = prepare_series(country, metric)
        if len(series) < 15: return jsonify({'error': 'Not enough data'}), 400
        vals        = np.array(series[metric].values, dtype=float)
        yrs         = np.array(series['year'].values)
        scaler      = MinMaxScaler()
        vals_scaled = scaler.fit_transform(vals.reshape(-1,1)).flatten()
        SEQ_LEN     = 3
        X, y = [], []
        for i in range(SEQ_LEN, len(vals_scaled)):
            X.append(vals_scaled[i-SEQ_LEN:i]); y.append(vals_scaled[i])
        X, y  = np.array(X), np.array(y)
        split = int(len(X) * 0.8)
        model = MLPRegressor(hidden_layer_sizes=(64,32), max_iter=500, random_state=42, early_stopping=True)
        model.fit(X[:split], y[:split])
        pred_scaled = model.predict(X[split:])
        pred   = scaler.inverse_transform(pred_scaled.reshape(-1,1)).flatten()
        actual = scaler.inverse_transform(y[split:].reshape(-1,1)).flatten()
        mae, rmse, mape = calc_metrics(actual, pred)
        fitted = [None]*SEQ_LEN + scaler.inverse_transform(model.predict(X).reshape(-1,1)).flatten().tolist()
        last_seq = vals_scaled[-SEQ_LEN:].tolist()
        fc_mean  = []
        for _ in range(fc_years_n):
            nv = model.predict([last_seq])[0]
            fc_mean.append(float(scaler.inverse_transform([[nv]])[0][0]))
            last_seq = last_seq[1:] + [nv]
        fc_mean = np.array(fc_mean)
        fc_yrs  = list(range(int(yrs[-1])+1, int(yrs[-1])+fc_years_n+1))
        std     = np.std(actual - pred)
        return jsonify({'model':'Neural Network', 'historical_years':yrs.tolist(), 'historical_values':vals.tolist(),
                        'fitted_values':fitted, 'forecast_years':fc_yrs, 'forecast_values':fc_mean.tolist(),
                        'lower_bound':(fc_mean-1.28*std).tolist(), 'upper_bound':(fc_mean+1.28*std).tolist(),
                        'metrics':{'mae':mae,'rmse':rmse,'mape':mape,'aic':None},
                        'test_years':yrs[split+SEQ_LEN:].tolist(), 'test_values':actual.tolist(), 'pred_values':pred.tolist()})
    except Exception as e:
        return jsonify({'error': f'Neural Network error: {str(e)}'}), 500

@app.route('/api/export/pdf', methods=['POST'])
def export_pdf():
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER
        from io import BytesIO
        data     = request.get_json()
        country  = data.get('country','Unknown')
        metric   = data.get('metric','')
        fc_data  = data.get('forecast',{})
        metrics  = data.get('metrics',{})
        insights = data.get('insights',{})
        weather  = data.get('weather',{})
        buffer   = BytesIO()
        doc      = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        green    = colors.HexColor('#22c55e')
        gray     = colors.HexColor('#6b7280')
        styles   = getSampleStyleSheet()
        title_style = ParagraphStyle('title', parent=styles['Title'], textColor=green, fontSize=22, spaceAfter=6, alignment=TA_CENTER)
        sub_style   = ParagraphStyle('sub', parent=styles['Normal'], textColor=gray, fontSize=10, spaceAfter=4, alignment=TA_CENTER)
        h2_style    = ParagraphStyle('h2', parent=styles['Heading2'], textColor=green, fontSize=13, spaceBefore=14, spaceAfter=6)
        body_style  = ParagraphStyle('body', parent=styles['Normal'], textColor=colors.HexColor('#374151'), fontSize=10, spaceAfter=4)
        story = []
        story.append(Paragraph("EnerCast Report", title_style))
        story.append(Paragraph("Intelligent Energy Consumption Forecasting and Optimization", sub_style))
        story.append(HRFlowable(width="100%", thickness=1, color=green, spaceAfter=10))
        story.append(Paragraph(f"Country: {country}   Metric: {metric.replace('_',' ').title()}", body_style))
        story.append(Spacer(1, 0.3*cm))
        if metrics:
            story.append(Paragraph("Model Performance", h2_style))
            perf = [["Metric","Value"],["MAE",f"{metrics.get('mae','N/A')} TWh"],["RMSE",f"{metrics.get('rmse','N/A')} TWh"],["MAPE",f"{metrics.get('mape','N/A')}%"],["AIC",f"{metrics.get('aic','N/A')}"]]
            pt = Table(perf, colWidths=[6*cm,11*cm])
            pt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),green),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),10),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f9fafb'),colors.white]),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),('LEFTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
            story.append(pt); story.append(Spacer(1, 0.3*cm))
        fc_years  = fc_data.get('forecast_years',[])
        fc_values = fc_data.get('forecast_values',[])
        if fc_years:
            story.append(Paragraph("Forecast Table", h2_style))
            fc_rows = [["Year","Forecast (TWh)","Lower","Upper"]]
            for i,yr in enumerate(fc_years):
                fc_rows.append([str(yr), f"{fc_values[i]:.2f}" if i<len(fc_values) else "N/A",
                                 f"{fc_data.get('lower_bound',[])[i]:.2f}" if i<len(fc_data.get('lower_bound',[])) else "N/A",
                                 f"{fc_data.get('upper_bound',[])[i]:.2f}" if i<len(fc_data.get('upper_bound',[])) else "N/A"])
            fct = Table(fc_rows, colWidths=[4*cm,5*cm,5*cm,5*cm])
            fct.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),green),('TEXTCOLOR',(0,0),(-1,0),colors.white),('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f9fafb'),colors.white]),('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#e5e7eb')),('LEFTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]))
            story.append(fct); story.append(Spacer(1, 0.3*cm))
        story.append(HRFlowable(width="100%", thickness=0.5, color=gray))
        story.append(Paragraph("EnerCast v2.0 - Team 8 | Keerthana Prabhu | Pooja K | Barath Vishnu R.P", sub_style))
        doc.build(story)
        buffer.seek(0)
        return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name=f'EnerCast_{country}_Report.pdf')
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Live Data Config ──────────────────────────────────────────────────────────
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")
NEWSAPI_KEY     = os.getenv("NEWSAPI_KEY")
CO2SIGNAL_KEY   = os.getenv("CO2SIGNAL_KEY")
EIA_KEY         = os.getenv("EIA_KEY")

# ── Simple in-memory cache ────────────────────────────────────────────────────
import time
_cache = {}
def cache_get(key):
    if key in _cache:
        val, ts = _cache[key]
        if time.time() - ts < 600:  # 10 min TTL
            return val
    return None
def cache_set(key, val):
    _cache[key] = (val, time.time())

# ── Weather route ─────────────────────────────────────────────────────────────
@app.route('/api/weather')
def get_weather():
    country = request.args.get('country', 'India')
    cached  = cache_get(f'weather_{country}')
    if cached: return jsonify(cached)
    try:
        # Step 1: geocode with OpenWeatherMap
        geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={country}&limit=1&appid={OPENWEATHER_KEY}"
        geo     = req.get(geo_url, timeout=5).json()
        if not geo: raise Exception("Geocode failed")
        lat, lon = geo[0]['lat'], geo[0]['lon']
        # Step 2: current weather
        w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}&units=metric"
        w     = req.get(w_url, timeout=5).json()
        if w.get('cod') != 200: raise Exception(w.get('message','OWM error'))
        temp        = round(w['main']['temp'], 1)
        humidity    = w['main']['humidity']
        description = w['weather'][0]['description'].title()
        wind_speed  = w['wind']['speed']
        # Step 3: weather-based energy recommendations
        recs = []
        if temp > 35:
            recs.append({'type':'alert',  'text': f'Extreme heat ({temp}°C) — expect surge in cooling/AC energy demand'})
        elif temp > 28:
            recs.append({'type':'warning','text': f'High temperature ({temp}°C) — elevated air conditioning load likely'})
        elif temp < 10:
            recs.append({'type':'alert',  'text': f'Cold weather ({temp}°C) — heating energy demand will spike'})
        elif temp < 18:
            recs.append({'type':'warning','text': f'Cool conditions ({temp}°C) — moderate heating demand expected'})
        else:
            recs.append({'type':'success','text': f'Comfortable temperature ({temp}°C) — optimal energy efficiency window'})
        if humidity > 80:
            recs.append({'type':'warning','text': f'High humidity ({humidity}%) — dehumidifiers and AC increase energy load'})
        if wind_speed > 10:
            recs.append({'type':'success','text': f'Strong winds ({wind_speed} m/s) — good conditions for wind energy generation'})
        if 'rain' in description.lower():
            recs.append({'type':'warning','text': 'Rainy weather — reduced solar generation, consider backup sources'})
        elif 'clear' in description.lower() or 'sunny' in description.lower():
            recs.append({'type':'success','text': 'Clear skies — excellent solar energy generation conditions'})
        result = {
            'city':        geo[0].get('name', country),
            'country':     geo[0].get('country', ''),
            'temp':        temp,
            'feels_like':  round(w['main']['feels_like'], 1),
            'humidity':    humidity,
            'description': description,
            'wind_speed':  wind_speed,
            'visibility':  w.get('visibility', 10000) // 1000,
            'recommendations': recs,
        }
        cache_set(f'weather_{country}', result)
        return jsonify(result)
    except Exception as e:
        # Fallback to Open-Meteo (no key needed)
        try:
            geo2 = req.get(f"https://geocoding-api.open-meteo.com/v1/search?name={country}&count=1", timeout=5).json()
            r    = geo2.get('results', [{}])[0]
            lat2, lon2 = r.get('latitude',20), r.get('longitude',77)
            city = r.get('name', country)
            om   = req.get(f"https://api.open-meteo.com/v1/forecast?latitude={lat2}&longitude={lon2}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code", timeout=5).json()
            cur  = om.get('current', {})
            temp        = cur.get('temperature_2m', 25)
            humidity    = cur.get('relative_humidity_2m', 60)
            wind_speed  = cur.get('wind_speed_10m', 5)
            wcode       = cur.get('weather_code', 0)
            desc_map    = {0:'Clear Sky',1:'Mainly Clear',2:'Partly Cloudy',3:'Overcast',
                           45:'Foggy',48:'Icy Fog',51:'Light Drizzle',61:'Light Rain',
                           63:'Moderate Rain',65:'Heavy Rain',71:'Light Snow',80:'Rain Showers',95:'Thunderstorm'}
            description = desc_map.get(wcode, 'Cloudy')
            recs = []
            if temp > 35:   recs.append({'type':'alert',  'text':f'Extreme heat ({temp}°C) — expect surge in cooling/AC demand'})
            elif temp > 28: recs.append({'type':'warning','text':f'High temperature ({temp}°C) — elevated AC load likely'})
            elif temp < 10: recs.append({'type':'alert',  'text':f'Cold weather ({temp}°C) — heating demand will spike'})
            else:           recs.append({'type':'success','text':f'Comfortable temperature ({temp}°C) — optimal efficiency window'})
            if wind_speed > 10: recs.append({'type':'success','text':f'Strong winds ({wind_speed} m/s) — good for wind energy generation'})
            if 'Rain' in description: recs.append({'type':'warning','text':'Rainy — reduced solar generation expected'})
            elif 'Clear' in description: recs.append({'type':'success','text':'Clear skies — excellent solar generation conditions'})
            result = {
                'city': city, 'country': country,
                'temp': temp, 'feels_like': temp - 2,
                'humidity': humidity, 'description': description,
                'wind_speed': wind_speed, 'visibility': 10,
                'recommendations': recs,
            }
            cache_set(f'weather_{country}', result)
            return jsonify(result)
        except Exception as e2:
            return jsonify({'error': str(e2)}), 500

# ── News route ────────────────────────────────────────────────────────────────
@app.route('/api/news')
def get_news():
    country = request.args.get('country', 'India')
    cached  = cache_get(f'news_{country}')
    if cached: return jsonify(cached)
    try:
        url    = f"https://newsapi.org/v2/everything?q=energy+{country}&sortBy=publishedAt&pageSize=6&apiKey={NEWSAPI_KEY}"
        data   = req.get(url, timeout=5).json()
        articles = [{
            'title':       a.get('title', ''),
            'description': a.get('description', ''),
            'url':         a.get('url', ''),
            'source':      a.get('source', {}).get('name', ''),
            'publishedAt': a.get('publishedAt', ''),
        } for a in data.get('articles', []) if a.get('title')]
        result = {'articles': articles[:6]}
        cache_set(f'news_{country}', result)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ── CO2 route ─────────────────────────────────────────────────────────────────
@app.route('/api/co2')
def get_co2():
    country_code = request.args.get('code', 'IN')
    cached       = cache_get(f'co2_{country_code}')
    if cached: return jsonify(cached)
    try:
        url     = f"https://api.co2signal.com/v1/latest?countryCode={country_code}"
        headers = {'auth-token': CO2SIGNAL_KEY}
        resp    = req.get(url, headers=headers, timeout=8)
        data    = resp.json()
        result  = {
            'intensity':    data.get('data', {}).get('carbonIntensity', 0),
            'fossil_pct':   data.get('data', {}).get('fossilFuelPercentage', 0),
            'unit':         data.get('units', {}).get('carbonIntensity', 'gCO2eq/kWh'),
            'country_code': country_code,
        }
        cache_set(f'co2_{country_code}', result)
        return jsonify(result)
    except Exception:
        # Fallback estimates when API is unavailable
        fallback = {
            'IN': {'intensity': 713, 'fossil_pct': 74.2},
            'US': {'intensity': 386, 'fossil_pct': 61.0},
            'GB': {'intensity': 186, 'fossil_pct': 41.5},
            'DE': {'intensity': 350, 'fossil_pct': 55.0},
            'CN': {'intensity': 555, 'fossil_pct': 68.0},
            'FR': {'intensity': 85,  'fossil_pct': 15.0},
            'BR': {'intensity': 160, 'fossil_pct': 22.0},
            'AU': {'intensity': 480, 'fossil_pct': 69.0},
        }
        fb = fallback.get(country_code, {'intensity': 400, 'fossil_pct': 55.0})
        return jsonify({
            'intensity':    fb['intensity'],
            'fossil_pct':   fb['fossil_pct'],
            'unit':         'gCO2eq/kWh',
            'country_code': country_code,
            'source':       'estimated'
        })

# ── Energy prices route ───────────────────────────────────────────────────────
@app.route('/api/energy-prices')
def get_energy_prices():
    cached = cache_get('energy_prices')
    if cached: return jsonify(cached)
    try:
        url  = f"https://api.eia.gov/v2/electricity/retail-sales/data/?api_key={EIA_KEY}&frequency=monthly&data[0]=price&sort[0][column]=period&sort[0][direction]=desc&length=1"
        data = req.get(url, timeout=5).json()
        if 'error' in data:
            raise Exception(data['error'])
        rows  = data.get('response', {}).get('data', [])
        price = rows[0].get('price') if rows else None
        result = {
            'price':  price,
            'unit':   'cents/kWh',
            'period': rows[0].get('period') if rows else 'N/A',
            'source': 'EIA',
        }
        cache_set('energy_prices', result)
        return jsonify(result)
    except Exception:
        return jsonify({
            'price':  16.24,
            'unit':   'cents/kWh',
            'period': '2025-12',
            'source': 'estimated',
            'note':   'EIA key pending activation'
        })


@app.route('/api/map-data', methods=['GET'])
def get_map_data():
    metric = request.args.get('metric', 'primary_energy_consumption')
    year   = int(request.args.get('year', 2022))
    cached = cache_get(f'map_{metric}_{year}')
    if cached: return jsonify(cached)
    try:
        result = {}
        for country in df['country'].unique():
            cdf = df[(df['country'] == country) & (df['year'] == year)]
            if len(cdf) > 0 and metric in cdf.columns:
                val = cdf[metric].values[0]
                if pd.notna(val) and val > 0:
                    result[country] = round(float(val), 2)
        cache_set(f'map_{metric}_{year}', result)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/forecast/ensemble', methods=['GET'])
def forecast_ensemble():
    country  = request.args.get('country', 'India')
    metric   = request.args.get('metric', 'primary_energy_consumption')
    fc_years = int(request.args.get('years', 7))
    cached   = cache_get(f'ensemble_{country}_{metric}_{fc_years}')
    if cached: return jsonify(cached)
    try:
        series = prepare_series(country, metric)
        if len(series) < 15: return jsonify({'error': 'Not enough data'}), 400
        vals  = series[metric].values
        years = series['year'].values
        split = int(len(vals) * 0.8)
        train, test = vals[:split], vals[split:]
        future_years = [int(years[-1]) + i + 1 for i in range(fc_years)]

        results = {}

        # ARIMA
        try:
            from statsmodels.tsa.arima.model import ARIMA
            m = ARIMA(train, order=(2,1,2)).fit()
            pred_a = m.forecast(len(test))
            full_a = ARIMA(vals, order=(2,1,2)).fit()
            fc_a   = full_a.forecast(fc_years)
            results['arima'] = {'test_pred': pred_a.tolist(), 'forecast': fc_a.tolist()}
        except: results['arima'] = None

        # Linear
        try:
            from sklearn.linear_model import LinearRegression
            X = np.arange(len(train)).reshape(-1,1)
            lr = LinearRegression().fit(X, train)
            pred_l = lr.predict(np.arange(len(train), len(train)+len(test)).reshape(-1,1))
            fc_l   = lr.predict(np.arange(len(vals), len(vals)+fc_years).reshape(-1,1))
            results['linear'] = {'test_pred': pred_l.tolist(), 'forecast': fc_l.tolist()}
        except: results['linear'] = None

        # Random Forest
        try:
            from sklearn.ensemble import RandomForestRegressor
            def make_features(data, n=3):
                X, y = [], []
                for i in range(n, len(data)):
                    X.append(data[i-n:i]); y.append(data[i])
                return np.array(X), np.array(y)
            Xr, yr = make_features(train)
            rf = RandomForestRegressor(n_estimators=100, random_state=42).fit(Xr, yr)
            pred_r, last = [], list(train[-3:])
            for _ in range(len(test)):
                p = rf.predict([last[-3:]])[0]; pred_r.append(p); last.append(p)
            fc_r, last2 = [], list(vals[-3:])
            for _ in range(fc_years):
                p = rf.predict([last2[-3:]])[0]; fc_r.append(p); last2.append(p)
            results['rf'] = {'test_pred': pred_r, 'forecast': fc_r}
        except: results['rf'] = None

        # Ensemble = average of available forecasts
        valid_fc = [r['forecast'] for r in results.values() if r]
        valid_tp = [r['test_pred'] for r in results.values() if r]
        ensemble_fc = np.mean(valid_fc, axis=0).tolist() if valid_fc else []
        ensemble_tp = np.mean(valid_tp, axis=0).tolist() if valid_tp else []

        mae_e  = float(np.mean(np.abs(np.array(ensemble_tp) - test[:len(ensemble_tp)])))
        mape_e = float(np.mean(np.abs((np.array(ensemble_tp) - test[:len(ensemble_tp)]) / (test[:len(ensemble_tp)] + 1e-9))) * 100)

        response = {
            'country': country, 'metric': metric,
            'historical_years':  years.tolist(),
            'historical_values': vals.tolist(),
            'forecast_years':    future_years,
            'ensemble_forecast': ensemble_fc,
            'models':            results,
            'test_years':        years[split:].tolist(),
            'test_actual':       test.tolist(),
            'ensemble_test':     ensemble_tp,
            'metrics': {
                'mae':  round(mae_e, 2),
                'mape': round(mape_e, 2),
            }
        }
        cache_set(f'ensemble_{country}_{metric}_{fc_years}', response)
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def admin_stats():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        total_users     = User.query.count()
        total_forecasts = SavedForecast.query.count()
        all_users       = User.query.all()
        all_forecasts   = SavedForecast.query.all()
        user_list = [{'id':u.id,'username':u.username,'email':u.email,
                      'forecasts': SavedForecast.query.filter_by(user_id=u.id).count()} for u in all_users]
        country_counts = {}
        model_counts   = {}
        for f in all_forecasts:
            country_counts[f.country]    = country_counts.get(f.country, 0) + 1
            model_counts[f.model_used]   = model_counts.get(f.model_used, 0) + 1
        top_countries = sorted(country_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_models    = sorted(model_counts.items(),   key=lambda x: x[1], reverse=True)
        return jsonify({
            'total_users':     total_users,
            'total_forecasts': total_forecasts,
            'users':           user_list,
            'top_countries':   top_countries,
            'top_models':      top_models,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/delete-user/<int:uid>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(uid):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        if uid == user_id:
            return jsonify({'error': 'Cannot delete yourself'}), 400
        SavedForecast.query.filter_by(user_id=uid).delete()
        User.query.filter_by(id=uid).delete()
        db.session.commit()
        return jsonify({'message': 'User deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

GMAIL_USER = os.getenv("GMAIL_USER")
GMAIL_PASS = os.getenv("GMAIL_PASS")

def send_email(to_email, subject, html_body):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = GMAIL_USER
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(GMAIL_USER, GMAIL_PASS)
        s.sendmail(GMAIL_USER, to_email, msg.as_string())

@app.route("/api/alerts/test", methods=["POST"])
@jwt_required()
def test_email():
    try:
        user_id = int(get_jwt_identity())
        user    = User.query.get(user_id)
        html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#0f4c2a,#1a6b3a);padding:40px 40px 32px;text-align:center">
    <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 20px;margin-bottom:16px">
      <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">⚡ EnerCast</span>
    </div>
    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0;letter-spacing:1px;text-transform:uppercase">Energy Intelligence Platform</p>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="color:#1a1a2e;font-size:22px;margin:0 0 8px;font-weight:700">Test Alert Confirmed ✅</h2>
    <p style="color:#666;font-size:15px;margin:0 0 28px;line-height:1.6">Hello <strong style="color:#1a1a2e">{user.username}</strong>, your EnerCast email notifications are working correctly.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px;margin-bottom:28px">
      <p style="margin:0;color:#166534;font-size:15px;font-weight:600">✅ Email alerts are active</p>
      <p style="margin:8px 0 0;color:#15803d;font-size:14px">You will receive forecast reports, anomaly alerts, and energy insights directly to this inbox.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Account</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1a1a2e">{user.username}</p>
        </td>
        <td width="16"></td>
        <td style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Status</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#16a34a">Active</p>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 EnerCast · Energy Forecasting Platform · <a href="#" style="color:#16a34a;text-decoration:none">Unsubscribe</a></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""
        send_email(user.email, "⚡ EnerCast — Test Alert", html)
        return jsonify({"message": f"Test email sent to {user.email}!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/alerts/forecast", methods=["POST"])
@jwt_required()
def send_forecast_alert():
    try:
        user_id = int(get_jwt_identity())
        user    = User.query.get(user_id)
        data    = request.get_json()
        country = data.get("country", "")
        metric  = data.get("metric", "")
        forecast_val = data.get("forecast_val", "")
        mape    = data.get("mape", "")
        html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <tr><td style="background:linear-gradient(135deg,#0f4c2a,#1a6b3a);padding:40px;text-align:center">
    <div style="font-size:28px;font-weight:800;color:#ffffff;margin-bottom:8px">⚡ EnerCast</div>
    <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:0;letter-spacing:1px;text-transform:uppercase">Forecast Report Ready</p>
  </td></tr>
  <tr><td style="padding:40px">
    <h2 style="color:#1a1a2e;font-size:22px;margin:0 0 8px">Your Forecast is Ready 🔮</h2>
    <p style="color:#666;font-size:15px;margin:0 0 28px">Hello <strong>{user.username}</strong>, here is your energy forecast report.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:28px">
      <tr style="background:#f8fafc"><td style="padding:14px 20px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Parameter</td><td style="padding:14px 20px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Value</td></tr>
      <tr style="border-top:1px solid #e2e8f0"><td style="padding:14px 20px;color:#666;font-size:14px">🌍 Country</td><td style="padding:14px 20px;color:#1a1a2e;font-weight:600;font-size:14px">{country}</td></tr>
      <tr style="border-top:1px solid #e2e8f0;background:#f8fafc"><td style="padding:14px 20px;color:#666;font-size:14px">📊 Metric</td><td style="padding:14px 20px;color:#1a1a2e;font-size:14px">{metric.replace('_',' ').title()}</td></tr>
      <tr style="border-top:1px solid #e2e8f0"><td style="padding:14px 20px;color:#666;font-size:14px">🔮 Next Year Forecast</td><td style="padding:14px 20px;font-weight:700;font-size:18px;color:#16a34a">{forecast_val} TWh</td></tr>
      <tr style="border-top:1px solid #e2e8f0;background:#f8fafc"><td style="padding:14px 20px;color:#666;font-size:14px">📐 Model Accuracy (MAPE)</td><td style="padding:14px 20px;color:#d97706;font-weight:600;font-size:14px">{mape}%</td></tr>
    </table>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px">
      <p style="margin:0;color:#166534;font-size:14px;font-weight:600">💡 What does this mean?</p>
      <p style="margin:8px 0 0;color:#15803d;font-size:13px;line-height:1.6">A MAPE below 5% indicates excellent forecast accuracy. Log in to EnerCast to view the full forecast chart, anomaly detection, and energy mix analysis.</p>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="margin:0;font-size:12px;color:#94a3b8">© 2025 EnerCast · Energy Forecasting Platform</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>"""
        send_email(user.email, f"⚡ EnerCast — Forecast Ready: {country}", html)
        return jsonify({"message": f"Forecast alert sent to {user.email}!"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/grid-live', methods=['GET'])
def get_grid_live():
    country = request.args.get('country', 'India')
    cached  = cache_get(f'grid_{country}')
    if cached: return jsonify(cached)
    try:
        geo  = req.get(f"https://geocoding-api.open-meteo.com/v1/search?name={country}&count=1", timeout=5).json()
        r    = geo.get('results', [{}])[0]
        lat, lon = r.get('latitude', 20), r.get('longitude', 77)
        url  = (f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                f"&current=temperature_2m,wind_speed_10m,direct_radiation,cloud_cover,relative_humidity_2m"
                f"&hourly=direct_radiation,wind_speed_10m&forecast_days=1")
        data = req.get(url, timeout=5).json()
        cur  = data.get('current', {})
        temp        = cur.get('temperature_2m', 25)
        wind        = cur.get('wind_speed_10m', 5)
        radiation   = cur.get('direct_radiation', 200)
        cloud       = cur.get('cloud_cover', 50)
        humidity    = cur.get('relative_humidity_2m', 60)

        # Solar potential (0-100%)
        solar_pct   = min(100, round(radiation / 10, 1))
        # Wind potential (0-100%), optimal at 12 m/s
        wind_pct    = min(100, round((wind / 12) * 100, 1))
        # Demand index based on temperature extremes
        if temp > 35:   demand = 95
        elif temp > 30: demand = 80
        elif temp > 25: demand = 65
        elif temp > 15: demand = 50
        elif temp > 5:  demand = 70
        else:           demand = 90

        # Hourly solar for chart
        hourly = data.get('hourly', {})
        hours  = hourly.get('time', [])[:24]
        solar_h = hourly.get('direct_radiation', [])[:24]
        wind_h  = hourly.get('wind_speed_10m', [])[:24]
        chart  = [{'time': h.split('T')[1], 'solar': round(s/10,1), 'wind': round(min(100,(w/12)*100),1)}
                  for h,s,w in zip(hours, solar_h, wind_h)]

        result = {
            'country': country, 'temp': temp, 'wind': wind,
            'radiation': radiation, 'cloud': cloud, 'humidity': humidity,
            'solar_pct': solar_pct, 'wind_pct': wind_pct, 'demand': demand,
            'chart': chart,
        }
        cache_set(f'grid_{country}', result)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database initialized!")
    print("Starting EnerCast API on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)

