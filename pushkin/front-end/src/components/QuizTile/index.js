//React
import React from 'react';
import { withRouter } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';

//Styling
import s from './styles.css';
import { Col, Image, Card, Button } from 'react-bootstrap';
//import PropTypes from 'prop-types';

//Other
import { CONFIG } from '../../config';
import * as i from 'react-social-icons';

//unneded imports
//import * as f from 'react-foundation';

//function numberWithCommas(x) {
//  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
//}

class QuizTile extends React.Component {
  state = {
    count: null
  };

  //  componentDidMount() {
  // Retrieve participant count
  //    let experimentApi = Axios.create({
  //      baseURL: CONFIG.apiEndpoint + this.props.id + '/'
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
    // Generate sharing links
    let url = CONFIG.frontEndURL + `${this.props.id}`;
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

      open: function(url) {
        var left = (window.screen.width - 570) / 2;
        var top = (window.screen.height - 570) / 2;
        var params = `menubar=no,toolbar=no,status=no,width=570,height=570,top=${top},left=${left}`;
        window.open(url, 'NewWindow', params);
      }
    };

    return (
      <Col xs={12} sm={6} md={6}>
        <div>
          <Card bsClass={s.panel}>
            <Card.Header>
              <div className={s.headerpadding}>
                <a className={s.title}>{this.props.title}</a>

                <LinkContainer to={'/quizzes/' + this.props.id}>
                  <Button bsStyle="danger">Play</Button>
                </LinkContainer>
              </div>
            </Card.Header>
            <Card.Body className={s.quizbox}>
              <div className={s.quizImgWrap}>
                <LinkContainer to={'/quizzes/' + this.props.id}>
                  <Image
                    src={this.props.img}
                    className="img-thumbnail"
                    style={{ backgroundColor: 'transparent', border: 0 }}
                    responsive
                  />
                </LinkContainer>
              </div>
              <div className={s.quizText}>
                {this.props.children}

                {this.props.duration && (
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
                )}
                <span className={s.pad5} target="_blank">
                  <i.SocialIcon
                    url={share.facebook}
                    onClick={e => {
                      e.preventDefault();
                      share.open(share.facebook);
                    }}
                    style={{ height: 30, width: 30 }}
                    target="_blank"
                  />
                </span>
                <span className={s.pad5} target="_blank">
                  <i.SocialIcon
                    url={share.twitter}
                    onClick={e => {
                      e.preventDefault();
                      share.open(share.twitter);
                    }}
                    style={{ height: 30, width: 30 }}
                    target="_blank"
                  />
                </span>
                <span className={s.pad5} target="_blank">
                  <i.SocialIcon
                    url={share.email}
                    style={{ height: 30, width: 30 }}
                    target="_blank"
                  />
                </span>
              </div>

              {/* BETA ribbon */}
              {this.props.beta && (
                <LinkContainer to={'/quizzes/' + this.props.id}>
                  <div className={s.ribbon + ' ' + s.ribbonBottomLeft}>
                    {' '}
                    <span>BETA</span>{' '}
                  </div>
                </LinkContainer>
              )}
            </Card.Body>
          </Card>
        </div>
        <br />
      </Col>
    );
  }
}

export default withRouter(QuizTile);
