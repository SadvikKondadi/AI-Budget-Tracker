from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

training_texts = [
    "starbucks coffee",
    "mcdonalds burger",
    "walmart groceries",
    "pizza restaurant",
    "uber ride",
    "lyft trip",
    "gas station",
    "flight ticket",
    "netflix subscription",
    "spotify music",
    "movie ticket",
    "amazon shopping",
    "target purchase",
    "electric bill",
    "water bill",
    "rent payment",
    "doctor visit",
    "pharmacy medicine",
    "tuition fee",
    "book purchase"
]

training_labels = [
    "Food",
    "Food",
    "Food",
    "Food",
    "Travel",
    "Travel",
    "Travel",
    "Travel",
    "Entertainment",
    "Entertainment",
    "Entertainment",
    "Shopping",
    "Shopping",
    "Bills",
    "Bills",
    "Rent",
    "Health",
    "Health",
    "Education",
    "Education"
]

vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(training_texts)

model = LogisticRegression()
model.fit(X, training_labels)

def predict_category(text: str):
    text_vector = vectorizer.transform([text.lower()])
    prediction = model.predict(text_vector)[0]
    return prediction