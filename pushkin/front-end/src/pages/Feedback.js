import React from 'react';

import { Container, Row } from 'react-bootstrap';

export default function Feedback() {
  return (
    <Container className="mt-5" style={{ height: '70vh' }}>
      <Row className="justify-content-center">
        <iframe
          src="https://docs.google.com/forms/d/e/1FAIpQLSdrJuL3JFBFOUUUDJKZ9RgNCLx8bkMJvGapM8Hy-85y5dAW9w/viewform?embedded=true"
          width="640"
          height="546"
          frameborder="0"
          marginheight="0"
          marginwidth="0"
        >
          Loading…
        </iframe>
      </Row>
    </Container>
  );
}
