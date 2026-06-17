import os
import time
import xml.etree.ElementTree as ET
import requests
from flask import Flask, render_template, jsonify, request
from bs4 import BeautifulSoup

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.xml"
CACHE_EXPIRY = 3600  # 1 hour in seconds

def fetch_feed_data(force=False):
    """
    Fetches the XML feed from Google. If cache is valid and force is False,
    returns the cached data. Otherwise, fetches from the live URL and caches it.
    """
    now = time.time()
    
    # Check if we can use cache
    if not force and os.path.exists(CACHE_FILE):
        file_time = os.path.getmtime(CACHE_FILE)
        if now - file_time < CACHE_EXPIRY:
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return f.read(), "cache"
            except Exception as e:
                app.logger.warning(f"Error reading cache file: {e}")

    # Fetch live
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        response.raise_for_status()
        xml_data = response.text
        
        # Save cache
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                f.write(xml_data)
        except Exception as e:
            app.logger.error(f"Error saving to cache: {e}")
            
        return xml_data, "live"
    except Exception as e:
        # Fallback to cache on network error
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return f.read(), "fallback"
            except Exception:
                pass
        raise e

def parse_release_notes(feed_xml):
    """
    Parses Atom XML feed and splits multi-part updates within <content> by <h3>.
    """
    # Parse the Atom XML
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    try:
        root = ET.fromstring(feed_xml.encode('utf-8'))
    except Exception as e:
        raise ValueError(f"XML Parsing Error: {e}")

    releases = []
    
    # Iterate through entries
    for entry in root.findall('atom:entry', namespaces):
        title = entry.find('atom:title', namespaces)
        title_text = title.text.strip() if title is not None and title.text else "Unknown Date"
        
        updated = entry.find('atom:updated', namespaces)
        updated_text = updated.text.strip() if updated is not None and updated.text else ""
        
        # Try to find link
        link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
        if link_elem is None:
            link_elem = entry.find('atom:link', namespaces)
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespaces)
        if content_elem is None or not content_elem.text:
            continue
            
        content_html = content_elem.text
        
        # Parse content html with BeautifulSoup
        soup = BeautifulSoup(content_html, 'html.parser')
        
        # Google's release notes usually separate individual notes using <h3> tags
        h3s = soup.find_all('h3')
        
        if not h3s:
            # If no <h3> header, wrap whole body
            releases.append({
                'id': f"{title_text.replace(' ', '_').replace(',', '')}_general_0",
                'date': title_text,
                'updated': updated_text,
                'link': link,
                'type': 'General',
                'description': content_html.strip()
            })
        else:
            for idx, h3 in enumerate(h3s):
                note_type = h3.get_text().strip()
                
                # Gather content until next sibling <h3>
                sibling = h3.next_sibling
                desc_parts = []
                while sibling and sibling.name != 'h3':
                    desc_parts.append(str(sibling))
                    sibling = sibling.next_sibling
                
                description = "".join(desc_parts).strip()
                
                # Generate unique ID for front-end referencing
                # Format: tag:google.com,2016:bigquery-release-notes#June_15_2026_Feature_0
                safe_date = title_text.replace(' ', '_').replace(',', '')
                safe_type = note_type.lower().replace(' ', '_')
                item_id = f"{safe_date}_{safe_type}_{idx}"
                
                releases.append({
                    'id': item_id,
                    'date': title_text,
                    'updated': updated_text,
                    'link': f"{link}#{safe_date}" if link else "",
                    'type': note_type,
                    'description': description
                })
                
    return releases

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    try:
        xml_data, source = fetch_feed_data(force=force_refresh)
        releases = parse_release_notes(xml_data)
        
        return jsonify({
            'success': True,
            'source': source,
            'count': len(releases),
            'releases': releases
        })
    except Exception as e:
        app.logger.error(f"Error serving releases: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Default to debug=True for ease of development/testing
    app.run(host='127.0.0.1', port=5000, debug=True)
