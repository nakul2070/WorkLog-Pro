#!/usr/bin/env python3
"""
Script to generate PNG from PlantUML file using PlantUML web server
"""
import zlib
import base64
import urllib.parse
import urllib.request
import sys
import os

def encode_plantuml(text):
    """Encode PlantUML text using deflate compression and base64 encoding"""
    # Compress using deflate
    compressed = zlib.compress(text.encode('utf-8'))
    # Encode to base64
    encoded = base64.b64encode(compressed).decode('ascii')
    # PlantUML uses a specific encoding format
    # Replace characters that are problematic in URLs
    encoded = encoded.replace('+', '-').replace('/', '_')
    return encoded

def generate_png(puml_file, output_file):
    """Generate PNG from PlantUML file"""
    try:
        # Read PlantUML file
        with open(puml_file, 'r', encoding='utf-8') as f:
            puml_content = f.read()
        
        print(f"Read PlantUML file: {puml_file}")
        print(f"Content length: {len(puml_content)} characters")
        
        # Encode the content
        encoded = encode_plantuml(puml_content)
        print("Encoded PlantUML content")
        
        # Construct PlantUML server URL
        url = f"http://www.plantuml.com/plantuml/png/{encoded}"
        
        print("Requesting PNG from PlantUML server...")
        # Request PNG from PlantUML server
        try:
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0')
            with urllib.request.urlopen(req, timeout=30) as response:
                png_data = response.read()
                # Save PNG file
                with open(output_file, 'wb') as f:
                    f.write(png_data)
                print(f"[SUCCESS] PNG generated successfully: {output_file}")
                print(f"  File size: {len(png_data)} bytes")
                return True
        except urllib.error.HTTPError as e:
            print(f"[ERROR] HTTP {e.code}")
            try:
                error_content = e.read().decode('utf-8')[:200]
                print(f"  Response: {error_content}")
            except:
                pass
            return False
            
    except FileNotFoundError:
        print(f"[ERROR] File not found: {puml_file}")
        return False
    except urllib.error.URLError as e:
        print(f"[ERROR] Network error: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] {e}")
        return False

if __name__ == "__main__":
    puml_file = "ER_DIAGRAM.puml"
    output_file = "ER_DIAGRAM.png"
    
    if not os.path.exists(puml_file):
        print(f"[ERROR] PlantUML file not found: {puml_file}")
        sys.exit(1)
    
    success = generate_png(puml_file, output_file)
    sys.exit(0 if success else 1)

