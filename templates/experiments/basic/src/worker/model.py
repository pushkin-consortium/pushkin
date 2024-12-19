import sys
import json

def to_uppercase(input_string):
    return input_string.upper()

if __name__ == "__main__":
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        print(f"Received input: {input_data}", file=sys.stderr)
        model_input = input_data['modelInput']
        
        # Process the input
        result = to_uppercase(model_input)
        
        # Output the result as JSON
        print(json.dumps({'prediction': result}))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)