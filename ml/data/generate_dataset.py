"""
Dataset Generator for Expense Category Classification
======================================================
Mirrors the schema and distribution of the Financial Transaction Description Dataset
available on Kaggle: https://www.kaggle.com/datasets/computingvictor/transactions-fraud-datasets

Dataset fields:
  - Transaction_Text: Natural language description of the transaction
  - Label: Category label (Food, Travel, Shopping, etc.)

Usage: python generate_dataset.py
"""

import csv
import random
import os

random.seed(42)

TEMPLATES = {
    "Food": [
        "ordered food from zomato", "swiggy delivery order", "restaurant dinner",
        "lunch at cafe", "dominos pizza order", "mcdonalds burger meal",
        "grocery shopping at dmart", "big bazaar grocery bill", "fruit and vegetables market",
        "kfc chicken bucket", "subway sandwich lunch", "ice cream parlor",
        "chai and snacks at stall", "biryani from restaurant", "breakfast at hotel",
        "coffee at starbucks", "bakery cake purchase", "milk and dairy products",
        "snacks and beverages", "fast food combo meal", "home cooked meal supplies",
        "rice and pulses purchase", "cooking oil and spices", "juice bar order",
        "tea shop payment", "canteen lunch bill", "buffet dinner",
        "sushi restaurant dinner", "chinese food delivery", "veg thali lunch",
    ],
    "Travel": [
        "uber ride to office", "ola cab to airport", "metro card recharge",
        "bus ticket booking", "train ticket irctc", "auto rickshaw fare",
        "petrol station refill", "toll plaza payment", "flight ticket booking",
        "hotel stay booking", "rapido bike taxi", "car rental service",
        "airport transfer cab", "highway fuel stop", "local bus pass renewal",
        "parking charges", "interstate bus booking", "taxi to railway station",
        "monthly metro pass", "shuttle service payment", "boat ride tourism",
        "travel agency booking", "bike service station fuel", "electric vehicle charging",
        "outstation cab hire", "cab ride to hospital", "ola electric scooter",
        "city bus token", "ferry ticket", "local train monthly pass",
    ],
    "Shopping": [
        "amazon online order", "flipkart purchase", "myntra clothing order",
        "lifestyle store shopping", "zara apparel purchase", "h&m clothing",
        "electronics purchase at reliance digital", "mobile accessories croma",
        "home decor item purchase", "kitchen appliance online",
        "shoes purchase at bata", "sports shoes nike", "watches at titan",
        "jewelry purchase", "sunglasses purchase", "bag and accessories",
        "furniture assembly ikea", "stationery items purchase", "toys for kids",
        "cosmetics and beauty products", "perfume purchase", "book order amazon",
        "art supplies purchase", "garden tools purchase", "cleaning supplies",
        "home improvement items", "discount store purchase", "factory outlet shopping",
        "gift items purchase", "seasonal sale shopping",
    ],
    "Utilities": [
        "electricity bill payment", "water bill payment", "gas cylinder booking",
        "internet bill jio fiber", "broadband recharge airtel", "mobile prepaid recharge",
        "postpaid mobile bill", "piped gas connection payment", "dth recharge tata play",
        "cable tv subscription", "municipal tax payment", "society maintenance charges",
        "home wifi bill", "landline phone bill", "generator fuel payment",
        "solar panel maintenance", "water purifier service", "air conditioner service",
        "pest control service", "garbage collection fee", "sewage charges",
        "insurance premium payment", "security camera subscription", "smart home device bill",
        "electricity meter reading charge", "gas pipeline connection", "bsnl bill payment",
        "vi postpaid bill", "apartment electricity bill", "utility portal payment",
    ],
    "Healthcare": [
        "doctor consultation fee", "pharmacy medicine purchase", "hospital outpatient bill",
        "diagnostic lab test", "blood test pathology", "xray radiology charge",
        "dentist appointment fee", "eye doctor checkup", "physiotherapy session",
        "gym membership fee", "yoga class subscription", "nutritionist consultation",
        "health insurance premium", "surgical equipment purchase", "medical equipment rental",
        "vaccination cost", "mental health counseling", "dermatologist visit",
        "orthopedic consultation", "cardiology checkup", "hospital room charge",
        "ambulance service charge", "health checkup package", "vitamins supplement purchase",
        "protein powder purchase", "fitness tracker purchase", "medical test online",
        "telemedicine consultation", "ayurveda treatment", "homeopathy doctor fee",
    ],
    "Education": [
        "udemy online course purchase", "coursera subscription fee", "school tuition fee",
        "college semester fee", "tuition class payment", "books and study material",
        "stationery for school", "coaching institute fee", "competitive exam fee",
        "workshop registration fee", "certification exam cost", "skill development course",
        "programming bootcamp fee", "language learning app subscription", "music class fee",
        "drawing classes payment", "library membership fee", "educational software license",
        "laptop for studies", "calculator purchase", "uniform and accessories school",
        "extracurricular activity fee", "sports coaching fee", "art and craft class",
        "dance class monthly fee", "swimming class subscription", "university application fee",
        "study abroad consultation", "exam preparation material", "online test series",
    ],
    "Entertainment": [
        "netflix subscription monthly", "amazon prime membership", "hotstar premium",
        "spotify music subscription", "youtube premium plan", "disney plus subscription",
        "movie tickets pvr cinemas", "inox multiplex tickets", "concert event tickets",
        "amusement park entry fee", "bowling alley game", "laser tag arena",
        "gaming arcade payment", "cricket match tickets", "football match entry",
        "standup comedy show", "theatre play tickets", "escape room booking",
        "theme park admission", "gaming laptop accessories", "ps5 game purchase",
        "board game purchase", "outdoor adventure activity", "paintball session",
        "go karting race", "bungee jumping fee", "water park tickets",
        "museum entry fee", "art exhibition ticket", "live music concert",
    ],
    "EMI": [
        "home loan emi payment", "car loan monthly emi", "personal loan installment",
        "education loan emi", "credit card minimum payment", "two wheeler loan emi",
        "gold loan repayment", "consumer durable loan emi", "laptop emi payment",
        "mobile phone emi deduction", "refrigerator emi payment", "air conditioner emi",
        "washing machine emi", "furniture loan installment", "business loan repayment",
        "mortgage monthly payment", "medical loan emi", "property loan installment",
        "vehicle loan deduction", "bajaj finance emi", "hdfc loan emi payment",
        "icici loan installment", "sbi home loan deduction", "axis bank emi payment",
        "kotak loan repayment", "no cost emi mobile", "bnpl repayment",
        "zero interest emi payment", "amazon emi deduction", "flipkart emi repayment",
    ],
    "Investment": [
        "mutual fund sip investment", "stock market purchase", "fd fixed deposit",
        "rd recurring deposit", "ppf public provident fund", "nps pension contribution",
        "elss tax saving fund", "gold etf purchase", "sovereign gold bond",
        "zerodha stock purchase", "groww mutual fund", "paytm money sip",
        "lic premium payment", "term insurance premium", "ulip premium",
        "nse equity buy", "bse share purchase", "index fund investment",
        "crypto purchase bitcoin", "real estate investment", "chit fund contribution",
        "post office rd", "sukanya samriddhi scheme", "senior citizen savings scheme",
        "dividend reinvestment", "direct equity purchase", "smallcase investment",
        "portfolio management fee", "demat account charges", "broker brokerage fee",
    ]
}

def generate_dataset(output_path="data/transactions.csv", total=6000):
    categories = list(TEMPLATES.keys())
    per_category = total // len(categories)
    
    rows = []
    for category, templates in TEMPLATES.items():
        count = per_category
        for i in range(count):
            base = random.choice(templates)
            # Add slight variations
            variations = [
                base,
                f"paid for {base}",
                f"{base} receipt",
                f"expense: {base}",
                base.replace(" ", "_").replace("_", " "),
            ]
            text = random.choice(variations)
            rows.append({"Transaction_Text": text, "Label": category})
    
    # Shuffle rows
    random.shuffle(rows)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["Transaction_Text", "Label"])
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✅ Dataset generated: {output_path}")
    print(f"   Total rows: {len(rows)}")
    print(f"   Categories: {', '.join(categories)}")
    print(f"   Per category: ~{per_category} rows")
    
    # Show class distribution
    from collections import Counter
    labels = [r["Label"] for r in rows]
    dist = Counter(labels)
    print("\nClass distribution:")
    for cat, count in sorted(dist.items()):
        print(f"  {cat}: {count}")
    
    return output_path

if __name__ == "__main__":
    generate_dataset()
