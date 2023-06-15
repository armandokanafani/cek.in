from google.cloud import storage
import joblib
from flask import Flask, jsonify, request

cekin = Flask('cekin')

# Create a Cloud Storage client
storage_client = storage.Client()

# Specify the bucket name and file name
bucket_name = 'ml-api-cekin'
file_name = 'model.pkl'

# Get a reference to the bucket and file
bucket = storage_client.get_bucket(bucket_name)
blob = bucket.blob(file_name)

# Download the file to a temporary location
temp_file = '/tmp/model.pkl'
blob.download_to_filename(temp_file)

# Load the K-Means model
model = joblib.load(temp_file)

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json['data']
    # Preprocess the data if needed
    # Perform K-Means prediction
    prediction = model.predict(data)
    # Return the prediction as a JSON response
    return jsonify({'prediction': prediction.tolist()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
