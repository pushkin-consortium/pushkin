import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import { PiPersonFill } from "react-icons/pi";
import { connect } from "react-redux";
import PushkinClient from "pushkin-client";
import jsYaml from "js-yaml";
import fs from "fs";
import "./assets/results.css";

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

const pushkin = new PushkinClient();
const expConfig = jsYaml.load(fs.readFileSync("../config.yaml"), "utf8");

const ExpResults = (props) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const getResults = async () => {
      if (props.userID) {
        try {
          await pushkin.connect(props.api);
          if (expConfig.resultsType === "percentileRank") {
            try {
              const rankData = await pushkin.getPercentileRank(
                props.userID,
                expConfig.experimentName,
              );
              setData(rankData);
            } catch (err) {
              console.error("Error fetching percentile rank data", err);
            }
          } else if (expConfig.resultsType === "modelPrediction") {
            try {
              const expData = await pushkin.getExpData(props.userID, expConfig.experimentName);
              // Input the key response from the latest trial
              const modelInput = expData.map((trial) => trial.response).slice(-1)[0];
              const modelPrediction = await pushkin.getModelPrediction(modelInput, "model.py");
              setData(modelPrediction);
            } catch (err) {
              console.error("Error fetching model prediction data", err);
            }
          }
        } catch (err) {
          console.error("Error connecting to API", err);
        } finally {
          setLoading(false);
        }
      }
    };

    getResults();
  }, [props.userID]);

  if (loading) {
    return (
      <div>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (expConfig.resultsType === "percentileRank") {
    if (data.totalRows === 0) {
      return (
        <div>
          <Container className="mt-5 text-center">
            <h1>Results aren't available for {expConfig.experimentName} yet!</h1>
            <h2>Check back later or try another experiment.</h2>
          </Container>
        </div>
      );
    }

    if (!data.percentileRank || !data.totalRows || !data.summary_stat) {
      return (
        <div>
          <Container className="mt-5 text-center">
            <h1>Oops! Something went wrong {":("}</h1>
          </Container>
        </div>
      );
    }

    const iconCount = 10;
    const iconRows = 1;
    const iconColumns = Math.ceil(iconCount / iconRows);
    const shadedColor = "blue";
    const unshadedColor = "grey";
    const animate = true;
    const animateDur = 5;

    const percentileRank = data.percentileRank.toFixed(2);
    const summary_stat = (data.summary_stat * 100).toFixed(2);
    const totalRows = data.totalRows;
    const shadedIcons = Math.floor((percentileRank * iconCount) / 100);
    const partialShade = (percentileRank % iconCount) / iconCount;

    const icons = Array.from({ length: iconCount }, (_, i) => {
      const offset =
        i < shadedIcons ? 1
        : i === shadedIcons ? partialShade
        : 0;
      const gradientId = `partial-shade-${i}`;
      const animateElement = (
        <animate
          attributeName="offset"
          from="0"
          to={offset}
          begin={`${(i * animateDur) / iconCount}s`}
          dur={`${animateDur / iconCount}s`}
          fill="freeze"
          repeatCount="1"
        />
      );

      return (
        <div key={i} className="icon-container">
          <svg width="0" height="0">
            <linearGradient id={gradientId}>
              <stop stopColor={shadedColor} offset={animate ? "0" : offset}>
                {animate && animateElement}
              </stop>
              <stop stopColor={unshadedColor} offset={animate ? "0" : offset}>
                {animate && animateElement}
              </stop>
            </linearGradient>
          </svg>
          <PiPersonFill className="icon" style={{ fill: `url(#${gradientId})` }} />
        </div>
      );
    });

    return (
      <Container className="mt-5 text-center">
        <h1>Your results for {expConfig.experimentName}</h1>
        <h2>You scored {summary_stat}%!</h2>
        <p>
          You scored higher than {percentileRank}% of {totalRows} other people who completed this
          experiment!
        </p>
        <div className="icon-grid" style={{ gridTemplateColumns: `repeat(${iconColumns}, auto)` }}>
          {icons}
        </div>
      </Container>
    );
  } else if (expConfig.resultsType === "modelPrediction") {
    if (!data || !data.prediction) {
      return (
        <div>
          <Container className="mt-5 text-center">
            <h1>Oops! Something went wrong {":("}</h1>
          </Container>
        </div>
      );
    }

    return (
      <Container className="mt-5 text-center">
        <h1>Your results for {expConfig.experimentName}</h1>
        <h2>Model prediction: You pressed "{data.prediction}"</h2>
      </Container>
    );
  } else {
    return (
      <div>
        <h1>Invalid results type in experiment config</h1>
      </div>
    );
  }
};

export default connect(mapStateToProps)(ExpResults);