import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { connect } from "react-redux";
import PushkinClient from "pushkin-client";

const mapStateToProps = (state) => {
  return {
    userID: state.userInfo.userID,
  };
};

const pushkin = new PushkinClient();

const ExpResults = (props) => {
  const { quizName } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const getResults = async () => {
      if (props.userID) {
        await pushkin.connect(props.api);
        const percentileRank = await pushkin.getPercentileRank(props.userID, quizName);
        setData({ percentileRank });
        setLoading(false);
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

  return (
    <div>
      <h1>Your results for {quizName}</h1>
      <p>
        You were faster than {(100 - data.percentileRank).toFixed(2)}% of other people who did this
        experiment!
      </p>
    </div>
  );
};

export default connect(mapStateToProps)(ExpResults);
