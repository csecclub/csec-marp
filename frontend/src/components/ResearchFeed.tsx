import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import DOMPurify from 'dompurify';

const FeedContainer = styled.div`
  width: 400px;
  padding: 20px;
  background-color: #252526;
  color: #dcdcdc;
  overflow-y: auto;
`;

const ErrorMessage = styled.div`
  color: #ff6b6b;
  margin-top: 20px;
`;

const LoadingMessage = styled.div`
  margin-top: 20px;
`;

interface ResearchFeedProps {
  topic: string;
}

const ResearchFeed: React.FC<ResearchFeedProps> = ({ topic }) => {
  const [article, setArticle] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await axios.post(`${BACKEND_URL}/generate-article`, {
          topic,
        });

        if (response.data.article) {
          setArticle(response.data.article);
        } else {
          setError('No article generated.');
        }
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Unable to fetch article at this time.');
      } finally {
        setLoading(false);
      }
    };

    if (topic && topic.trim().length > 0) {
      fetchArticle();
    } else {
      setArticle('');
    }
  }, [topic, BACKEND_URL]);

  return (
    <FeedContainer>
      <h2>Generated Article</h2>
      {loading && <LoadingMessage>Loading article...</LoadingMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {article && (
        <div
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article) }}
        />
      )}
    </FeedContainer>
  );
};

export default ResearchFeed;
