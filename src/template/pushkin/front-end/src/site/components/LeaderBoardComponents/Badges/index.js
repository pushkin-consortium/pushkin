import React from 'react';
import { Button } from 'react-bootstrap';
import s from './styles.css';
import { Row, Col, Image, ProgressBar, Table, Badge } from "react-bootstrap";

class Badges extends React.Component {

  constructor(props) {
    super(props);

  }

  componentDidMount() {
    this.render();
  }

  render() {
    return (
      <Badge>42</Badge>
    );
  }
}
export default Badges;
