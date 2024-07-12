from app import app

if __name__ == "__main__":
    from waitress import serve
    import logging
    logger = logging.getLogger('waitress')
    logger.setLevel(logging.DEBUG)
    serve(app, host="0.0.0.0", port=8000)
