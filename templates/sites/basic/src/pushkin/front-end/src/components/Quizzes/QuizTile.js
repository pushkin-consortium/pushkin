import React, { Component } from 'react';
import { LinkContainer } from 'react-router-bootstrap';

import { Card, Button, Row, Col } from 'react-bootstrap';

//Other
import { CONFIG } from '../../config';
import * as i from 'react-social-icons';
import { StyleSheet, css } from 'aphrodite';

class QuizTile extends Component {
  state = {
    count: null
  };

  //  componentDidMount() {
  // Retrieve participant count
  //    let experimentApi = Axios.create({
  //      baseURL: CONFIG.apiEndpoint + this.props.quizid + '/'
  //    });
  //    experimentApi
  //      .get('/count?started=true')
  //      .then(response => {
  //        let count = response.data.count;
  //        count = numberWithCommas(count);
  //        this.setState({ count });
  //      })
  //      .catch(error => console.error('Error loading participant count:', error));
  //  }

  render() {
    // styling
    const styles = {
      card: {
        backgroundColor: '#B7E0F2',
        borderRadius: 55,
        padding: '1rem'
      },
      cardTitle: {
        fontSize: 26,
        fontWeight: 600
      }
    };

    const hoverStyles = StyleSheet.create({
      cardImage: {
        width: '100%',
        objectFit: 'cover'
      },
      cardButton: {
        backgroundColor: '#FF6200',
        color: 'white',
        border: 0,
        ':hover': {
          backgroundColor: '#FFAF7D',
          transition: '0.3s'
        }
      },
      socialIcon: {
        height: 40,
        width: 40,
        margin: 3,
        opacity: 1
      },
      opacityStyle: {
        opacity: 1,
        ':hover': {
          cursor: 'pointer',
          opacity: 0.6,
          transition: '0.3s'
        }
      },
      circleStyle: {
        borderRadius: '50%'
      }
    });

    // Generate sharing links
    let url = CONFIG.frontEndURL + `${this.props.quizid}`;
    let subject = CONFIG.citizenScienceWebsite + ` - ${this.props.title}`;
    let text = `${this.props.post}`;
    let hashtags = CONFIG.hashtags;

    // Encode all special characters
    url = encodeURIComponent(url);
    subject = encodeURIComponent(subject);
    text = encodeURIComponent(text);
    hashtags = encodeURIComponent(hashtags);

    let share = {
      facebook: `https://www.facebook.com/sharer.php?u=` + url,
      twitter: `https://twitter.com/intent/tweet?url=${url}&hashtags=${hashtags}&text=${text}`,
      email: `mailto:?subject=${subject}&body=${text}`,

      open: function (url) {
        var left = (window.screen.width - 570) / 2;
        var top = (window.screen.height - 570) / 2;
        var params = `menubar=no,toolbar=no,status=no,width=570,height=570,top=${top},left=${left}`;
        window.open(url, 'NewWindow', params);
      }
    };

    return (
      <Col md={4} className="mt-5 d-flex align-items-stretch">
        <Card className="border-0 shadow" style={styles.card}>
          <Card.Body>
            <LinkContainer
              // style={styles.cardButton}
              to={'/quizzes/' + this.props.quizid}
              className={css(hoverStyles.opacityStyle, hoverStyles.circleStyle)}
            >
              <Card.Img src={this.props.img} style={styles.cardImage} />
            </LinkContainer>
            <Card.Title className="mt-4" style={styles.cardTitle}>
              {this.props.title}
            </Card.Title>
            <Card.Text className="mt-4" style={styles.cardText}>
              {this.props.text}

              {/* {this.props.duration && (
                <p>
                  {' '}
                  <strong>
                    {' '}
                    Average time: {this.props.duration} minutes.{' '}
                  </strong>{' '}
                </p>
              )}

              {this.state.count && (
                <p> {this.state.count} players so far! </p>
              )} */}
            </Card.Text>
          </Card.Body>
          <Row className="justify-content-center mt-2">
            <LinkContainer
              // style={styles.cardButton}
              to={'/quizzes/' + this.props.quizid}
            >
              <Button className={css(hoverStyles.cardButton)}>Play Now</Button>
            </LinkContainer>
          </Row>
          <Row className="justify-content-center mt-3 mb-3">
            <i.SocialIcon
              url={share.facebook}
              onClick={e => {
                e.preventDefault();
                share.open(share.facebook);
              }}
              className={css(hoverStyles.socialIcon, hoverStyles.opacityStyle)}
              target="_blank"
            />
            <i.SocialIcon
              url={share.twitter}
              onClick={e => {
                e.preventDefault();
                share.open(share.twitter);
              }}
              className={css(hoverStyles.socialIcon, hoverStyles.opacityStyle)}
              target="_blank"
            />
            <i.SocialIcon
              url={share.email}
              className={css(hoverStyles.socialIcon, hoverStyles.opacityStyle)}
              target="_blank"
            />
            {/* BETA ribbon */}
            {/* {this.props.beta && (
              <LinkContainer to={'/quizzes/' + this.props.quizid}>
                <div className={s.ribbon + ' ' + s.ribbonBottomLeft}>
                  {' '}
                  <span>BETA</span>{' '}
                </div>
              </LinkContainer>
            )} */}
          </Row>
        </Card>
      </Col>
    );
  }
}

export default QuizTile;
