import React from 'react';

import { Row, Col, Form, Button } from 'react-bootstrap';

const styles = {
  label: {
    textAlign: 'left'
  }
};

const EditProfile = props => {
  return (
    <Row>
      <Col md={{ span: 6, offset: 3 }}>
        <Form className="justify-content-center">
          <Form.Row>
            <Form.Group as={Col}>
              <Form.Label style={styles.label}>First Name</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="First name"
                defaultValue={props.userFirstName}
              />
            </Form.Group>
            <Form.Group as={Col}>
              <Form.Label style={styles.label}>Last Name</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Last name"
                defaultValue={props.userLastName}
              />
            </Form.Group>
          </Form.Row>
          <Form.Group>
            <Form.Label style={styles.label}>Nickname</Form.Label>
            <Form.Control type="text" placeholder="Nickname" />
          </Form.Group>
          <Form.Group>
            <Form.Label style={styles.label}>
              Set a subscription email
            </Form.Label>
            <Form.Control
              type="email"
              placeholder="Enter email"
              defaultValue={props.userEmail}
            />
            <Form.Control.Feedback type="invalid">
              Please enter a valid email or leave empty.
            </Form.Control.Feedback>
          </Form.Group>
          <Row className="justify-content-center">
            <Button type="submit" onClick={e => e.preventDefault()}>
              Submit
            </Button>
          </Row>
        </Form>
      </Col>
    </Row>
  );
};

export default EditProfile;
