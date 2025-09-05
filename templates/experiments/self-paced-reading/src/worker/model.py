import sys
import json

def to_uppercase(input_string):
    return input_string.upper()

if __name__ == "__main__":
    try:
        # Read input from sys.argv
        input_data = json.loads(sys.argv[1])
        model_input = input_data['modelInput']
        
        # Process the input
        result = to_uppercase(model_input)
        
        # Output the result as JSON to stdout
        # NB: Because the experiment worker picks up the output from stdout,
        #     you shouldn't have other print statements in your model.
        #     It's recommended to debug your model outside Pushkin first.
        print(json.dumps({'prediction': result}))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)