import React from 'react';

import people from '../components/TeamMember/People';
import TeamMember from '../components/TeamMember/TeamMember';

// styling
import { Container, Row, Card, CardDeck, Jumbotron } from 'react-bootstrap';

// background image for header
import headerImage from '../assets/images/aboutPage/AboutUs.jpeg';

export default function AboutPage(props) {
  if (!props.children) {
    return (
      <Container className="p-0 text-center" fluid>
        <Jumbotron
          style={{
            backgroundImage: `url(${headerImage})`,
            backgroundPosition: 'center center',
            marginBottom: '0px',
            borderRadius: '0'
          }}
        >
          <h1 className="justify-content-center">Who We Are</h1>
          <h4 className="justify-content-center">
            We do citizen science to learn how the mind works.
            <br />
            We are awesome scientists!
          </h4>
        </Jumbotron>
        <br />
        <Container>
          <Row className="h2 mb-3 justify-content-center">
            Meet Our Team Members!
          </Row>
          <hr style={{ marginBottom: '0px' }} />
          <Row>
            {people.map(p => {
              return (
                <TeamMember
                  name={p.name}
                  key={p.name}
                  description={p.description}
                  image={require('../assets/images/teamMember/' + p.image)}
                />
              );
            })}
          </Row>
        </Container>
      </Container>
    );
  }
  return props.children;
}
