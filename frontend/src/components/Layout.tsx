import React, { useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import Editor from './Editor';
import ResearchFeed from './ResearchFeed';

const Container = styled.div`
  display: flex;
  height: 100vh;
`;

const Layout: React.FC = () => {
  const { id: documentId } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<string>(''); // New state for topic

  return (
    <Container>
      <Editor documentId={documentId} setTopic={setTopic} />
      <ResearchFeed topic={topic} />
    </Container>
  );
};

export default Layout;
