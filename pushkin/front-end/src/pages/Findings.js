import React from 'react';

import FindingsCard from '../components/Findings/FindingsCard';
import FindingsData from '../components/Findings/FindingsData';

import { Container } from 'react-bootstrap';

const FindingsPage = () => {
  return (
    <Container fluid className="text-center">
      {FindingsData.map(f => {
        return (
          <FindingsCard
            key={f.id}
            title={f.title}
            image={require('../assets/images/findingsPage/' + f.image)}
            description={f.description}
            link={f.link}
            url={f.url}
          />
        );
      })}
    </Container>
  );
};

export default FindingsPage;
