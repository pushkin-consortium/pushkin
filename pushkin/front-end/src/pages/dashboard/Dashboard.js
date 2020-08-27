import React, { useState, Fragment } from 'react';

import EditProfile from './EditProfile';
import ExperimentHistory from './ExperimentHistory';

import { Container, Jumbotron, Image, Button, Row } from 'react-bootstrap';

import { useAuth0 } from '../../utils/react-auth0-spa';

const styles = {
  jumbotron: {
    backgroundColor: '#3F729B'
  },
  avatar: {
    width: '10rem',
    height: '10rem'
  },
  card: {
    backgroundColor: '#B7E0F2',
    borderRadius: 55,
    padding: '3rem'
  },
  cardImage: {
    height: '100%',
    objectFit: 'cover',
    borderRadius: 55
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0)',
    color: '#FF6200',
    border: '0',
    alignSelf: 'center',
    fontWeight: '500',
    fontSize: 22,
    cursor: 'pointer'
  }
};

const Dashboard = () => {
  const { loading, user } = useAuth0();

  const [editProfile, showEditProfile] = useState(false);
  const [experimentHistory, showExperimentHistory] = useState(true);

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <Container fluid className="m-0 p-0 justify-content-center">
      <Jumbotron
        className="text-center justify-content-center"
        fluid
        style={styles.jumbotron}
      >
        <Image src={user.picture} style={styles.avatar} />
        <h2 className="m-4 text-white">Hello, {user.name}!</h2>
        <Row className="justify-content-center m-1">
          <Button
            onClick={() => {
              showEditProfile(editProfile => true);
              showExperimentHistory(experimentHistory => false);
            }}
            style={styles.button}
          >
            Edit Profile
          </Button>
          <Button
            onClick={() => {
              showEditProfile(editProfile => false);
              showExperimentHistory(experimentHistory => true);
            }}
            style={styles.button}
          >
            My Recent Experiments
          </Button>
        </Row>
      </Jumbotron>

      <Container>
        {editProfile && (
          <Fragment>
            <EditProfile
              userEmail={user.email}
              userFirstName={user.given_name}
              userLastName={user.family_name}
            />
          </Fragment>
        )}

        {experimentHistory && (
          <Fragment>
            <ExperimentHistory />
          </Fragment>
        )}
      </Container>
    </Container>
  );
};

export default Dashboard;
