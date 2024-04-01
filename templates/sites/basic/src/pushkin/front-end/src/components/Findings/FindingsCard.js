import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

const styles = {
  card: {
    backgroundColor: '#B7E0F2',
    borderRadius: 55,
    padding: '3vw',
    display: 'flex',
    flexDirection: 'row'
  },
  cardImage: {
    height: '100%',
    objectFit: 'cover',
    borderRadius: 55
  },
  cardTitle: {
    fontSize: '4vmin'
  },
  cardText: {
    fontSize: '2.5vmin'
  }
};

const FindingsCard = props => {
  return (
    <Card className="mt-5 border-0 shadow" style={styles.card}>
      <Row>
        <Col md={5}>
          <Card.Img src={props.image} style={styles.cardImage} />
        </Col>
        <Col md={7}>
          <Card.Body>
            <Card.Title style={styles.cardTitle}>{props.title}</Card.Title>
            <Card.Text style={styles.cardText}>{props.description}</Card.Text>
          </Card.Body>
          {props.link && (
            <LinkContainer to={props.url}>
              <a>
                <strong>Read more</strong>
              </a>
            </LinkContainer>
          )}
        </Col>
      </Row>
    </Card>
  );
};

export default FindingsCard;
