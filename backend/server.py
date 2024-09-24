from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import toml
from knowledge_storm import STORMWikiRunnerArguments, STORMWikiRunner, STORMWikiLMConfigs
from knowledge_storm.lm import OpenAIModel
from knowledge_storm.rm import YouRM

# Load API keys from environment variables or secrets.toml
def load_api_keys():
    if 'OPENAI_API_KEY' in os.environ and 'YDC_API_KEY' in os.environ:
        return {
            'OPENAI_API_KEY': os.environ['OPENAI_API_KEY'],
            'YDC_API_KEY': os.environ['YDC_API_KEY'],
        }
    else:
        secrets_file = os.path.join(os.path.dirname(__file__), 'secrets.toml')
        if not os.path.exists(secrets_file):
            raise FileNotFoundError('secrets.toml file not found.')
        secrets = toml.load(secrets_file)
        return secrets

api_keys = load_api_keys()

OPENAI_API_KEY = api_keys.get('OPENAI_API_KEY')
YDC_API_KEY = api_keys.get('YDC_API_KEY')

if not OPENAI_API_KEY or not YDC_API_KEY:
    raise Exception("API keys not set. Please set OPENAI_API_KEY and YDC_API_KEY.")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure STORM
def configure_storm():
    lm_configs = STORMWikiLMConfigs()
    openai_kwargs = {
        'api_key': OPENAI_API_KEY,
        'temperature': 0.7,
        'top_p': 0.9,
    }

    # Initialize language models
    gpt_35 = OpenAIModel(model='gpt-3.5-turbo', max_tokens=500, **openai_kwargs)
    gpt_4 = OpenAIModel(model='gpt-4', max_tokens=3000, **openai_kwargs)

    # Assign models to different components
    lm_configs.set_conv_simulator_lm(gpt_35)
    lm_configs.set_question_asker_lm(gpt_35)
    lm_configs.set_outline_gen_lm(gpt_4)
    lm_configs.set_article_gen_lm(gpt_4)
    lm_configs.set_article_polish_lm(gpt_4)

    # STORM runner arguments
    engine_args = STORMWikiRunnerArguments()
    rm = YouRM(ydc_api_key=YDC_API_KEY, k=engine_args.search_top_k)
    runner = STORMWikiRunner(engine_args, lm_configs, rm)
    return runner

runner = configure_storm()

@app.route('/generate-article', methods=['POST'])
def generate_article():
    data = request.json
    topic = data.get('topic')

    if not topic:
        return jsonify({'error': 'Topic not provided.'}), 400

    try:
        # Run STORM to generate the article
        runner.run(
            topic=topic,
            do_research=True,
            do_generate_outline=True,
            do_generate_article=True,
            do_polish_article=True,
        )
        runner.post_run()
        runner.summary()

        # Retrieve the generated article
        article = runner.get_article()  # Assuming get_article() returns the article text

        if not article:
            return jsonify({'error': 'No article generated.'}), 500

        return jsonify({'article': article})
    except Exception as e:
        print(f"Error generating article: {e}")
        return jsonify({'error': 'Failed to generate article.'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3001))
    app.run(host='0.0.0.0', port=port)
