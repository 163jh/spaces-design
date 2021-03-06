/*
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

define(function (require, exports, module) {
    "use strict";

    var React = require("react"),
        ReactDOM = require("react-dom"),
        Fluxxor = require("fluxxor"),
        FluxMixin = Fluxxor.FluxMixin(React),
        StoreWatchMixin = Fluxxor.StoreWatchMixin,
        d3 = require("d3"),
        _ = require("lodash");

    var UI = require("adapter").ps.ui;

    var PolicyOverlay = React.createClass({
        mixins: [FluxMixin, StoreWatchMixin("policy", "panel")],

        /**
         * D3 element where policies are being drawn
         *
         * @type {SVGElement}
         */
        _scrimGroup: null,

        /**
         * Debounced draw function, set in componentWillMount
         *
         * @type {function()}
         */
        _drawDebounced: null,

        getStateFromFlux: function () {
            var flux = this.getFlux(),
                policyStore = flux.store("policy"),
                panelStore = flux.store("panel"),
                pointerPolicies = policyStore.getMasterPointerPolicyList(),
                canvasBounds = panelStore.getCloakRect();

            return {
                policies: pointerPolicies,
                canvasBounds: canvasBounds
            };
        },

        shouldComponentUpdate: function (nextProps, nextState) {
            return this.props.transformString !== nextProps.transformString ||
                this.state.policies !== nextState.policies ||
                this.state.canvasBounds !== nextState.canvasBounds;
        },

        componentWillMount: function () {
            this._drawDebounced = _.debounce(this.drawOverlay, 100, false);
        },
        
        componentDidMount: function () {
            this._drawDebounced();
            window.addEventListener("resize", this._drawDebounced);
        },

        componentWillUnmount: function () {
            window.removeEventListener("resize", this._drawDebounced);
            this._drawDebounced.cancel();
        },

        componentDidUpdate: function () {
            this._drawDebounced();
        },

        /**
         * Draws the policy overlay showing where the pointer policies are
         */
        drawOverlay: function () {
            var svg = d3.select(ReactDOM.findDOMNode(this));

            svg.selectAll(".policy-overlays").remove();
            
            this._scrimGroup = svg.insert("g", ".policy-group")
                .classed("policy-overlays", true)
                .attr("transform", this.props.transformString);

            this.drawPolicies(this.state.policies);
            this.drawCanvasBounds(this.state.canvasBounds);
        },

        /**
         * Draws the pointer policies that have defined areas
         * 
         * @param {Array.<object>} policies
         */
        drawPolicies: function (policies) {
            policies.forEach(function (policy) {
                var area = policy.area,
                    areaIsValid = area && area[2] > 0 && area[3] > 0;

                if (areaIsValid) {
                    var policyRect = this._scrimGroup
                        .append("rect")
                        .attr("x", area[0])
                        .attr("y", area[1])
                        .attr("width", area[2])
                        .attr("height", area[3])
                        .style("fill-opacity", "0.0")
                        .style("stroke-opacity", "0.0");
    
                    if (policy.action === UI.policyAction.PROPAGATE_TO_PHOTOSHOP) {
                        policyRect.style("stroke", "#008800")
                            .style("stroke-opacity", "1.0");
                    } else if (policy.action === UI.policyAction.PROPAGATE_TO_BROWSER) {
                        policyRect.style("stroke", "#FF2200")
                            .style("stroke-opacity", "1.0");
                    } else if (policy.action === UI.policyAction.PROPAGATE_BY_ALPHA) {
                        policyRect.style("stroke", "#0066FF")
                            .style("stroke-opacity", "0.25");
                    }
                }
            }, this);
        },

        /**
         * Draws the canvas bounds as defined by the UI edges.
         * 
         * @param {?object} canvasBounds
         */
        drawCanvasBounds: function (canvasBounds) {
            if (!canvasBounds) {
                return;
            }

            var canvasWidth = canvasBounds.right - canvasBounds.left,
                canvasHeight = canvasBounds.bottom - canvasBounds.top;

            if (canvasWidth > 0 && canvasHeight > 0) {
                this._scrimGroup
                    .append("rect")
                    .attr("x", canvasBounds.left)
                    .attr("y", canvasBounds.top)
                    .attr("width", canvasWidth)
                    .attr("height", canvasHeight)
                    .style("fill-opacity", "0.0")
                    .style("stroke", "hotpink")
                    .style("stroke-width", "4px")
                    .style("stroke-opacity", "1.0");
            }
        },

        render: function () {
            return (<g />);
        }
    });

    module.exports = PolicyOverlay;
});
