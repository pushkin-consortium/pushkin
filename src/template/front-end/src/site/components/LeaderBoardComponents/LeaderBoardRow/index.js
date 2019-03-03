import React from 'react';
const LeaderBoardRow = ({ position, userName, score }) => {
  return(
      <tr>
        <td>{position + 1}</td>
        <td>{userName}</td>
        <td>{score}</td>
     </tr>
  )
}
export default LeaderBoardRow;
