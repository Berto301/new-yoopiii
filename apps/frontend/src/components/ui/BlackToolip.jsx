import Tooltip from "@material-ui/core/Tooltip";
import { withStyles } from "@material-ui/core/styles";

/**
 * @type typeof Tooltip
 */
// @ts-ignore
const BlackTooltip = withStyles(() => ({
  tooltip: {
    maxWidth: "500px",
    maxHeight: "500px",
    backgroundColor: "#3F3F51",
    fontFamily: "Poppins_Medium",
    fontSize: "12px",
    padding: "12px 17px",
    whiteSpace: "break-spaces",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  arrow: {
    backgroundColor: "#3F3F51"
  }
}))(Tooltip);

export default BlackTooltip;
