/* global window, document */
import 'babel-polyfill';

import DeckGL, {autobind} from 'deck.gl/react';

import {Matrix4} from 'luma.gl';

import React, {PureComponent} from 'react';
import ReactDOM from 'react-dom';
import MapboxGLMap from 'react-map-gl';
import {FPSStats} from 'react-stats';

import LayerInfo from './layer-info';
import LayerSelector from './layer-selector';
import LayerControls from './layer-controls';
import LAYER_CATEGORIES from './layer-examples';

/* eslint-disable no-process-env */
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || // eslint-disable-line
  'Set MAPBOX_ACCESS_TOKEN environment variable or put your token here.';

const noop = () => {};

// ---- View ---- //
class App extends PureComponent {
  constructor(props) {
    super(props);
    autobind(this);

    this.state = {
      mapViewState: {
        latitude: 37.751537058389985,
        longitude: -122.42694203247012,
        zoom: 11.5,
        pitch: 30,
        bearing: 0
      },
      activeExamples: {},
      settings: {
        effects: false,
        separation: 0,
        rotationZ: 0,
        rotationX: 0
      }
    };
  }

  componentWillMount() {
    this._onResize();
    window.addEventListener('resize', this._onResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._onResize);
  }

  _onResize() {
    this.setState({width: window.innerWidth, height: window.innerHeight});
  }

  _onViewportChanged(mapViewState) {
    if (mapViewState.pitch > 60) {
      mapViewState.pitch = 60;
    }
    this.setState({mapViewState});
  }

  _onToggleLayer(exampleName, example) {
    const activeExamples = {...this.state.activeExamples};

    if (activeExamples[exampleName]) {
      activeExamples[exampleName] = null;
    } else {
      activeExamples[exampleName] = {
        ...example.layer.defaultProps,
        ...example.props
      };
    }
    this.setState({activeExamples});
  }

  _onUpdateLayerSettings(exampleName, settings) {
    const activeExamples = {...this.state.activeExamples};

    activeExamples[exampleName] = {
      ...activeExamples[exampleName],
      ...settings
    };
    this.setState({activeExamples});
  }

  _onUpdateContainerSettings(settings) {
    this.setState({settings});
  }

  _renderExampleLayer(example, settings, index) {
    const {layer: Layer, props, getData} = example;
    const {infoPanel} = this.refs;
    const layerProps = Object.assign({}, props, settings);

    if (props.pickable) {
      Object.assign(layerProps, {
        onHover: infoPanel ? infoPanel.onItemHovered : noop,
        onClick: infoPanel ? infoPanel.onItemClicked : noop
      });
    }

    if (getData) {
      Object.assign(layerProps, {data: getData()});
    }

    Object.assign(layerProps, {
      modelMatrix: this._getModelMatrix(index, layerProps.projectionMode === 2)
    });

    return new Layer(layerProps);
  }

  _renderExamples() {
    let index = 1;
    const layers = [];
    for (const categoryName of Object.keys(LAYER_CATEGORIES)) {
      for (const exampleName of Object.keys(LAYER_CATEGORIES[categoryName])) {

        const settings = this.state.activeExamples[exampleName];
        // An example is a function that returns a DeckGL layer instance
        if (settings) {
          const example = LAYER_CATEGORIES[categoryName][exampleName];
          layers.push(this._renderExampleLayer(example, settings, index++));
        }
      }
    }
    return layers;
  }

  _getModelMatrix(index, offsetMode) {
    const {settings: {separation, rotationZ, rotationX}} = this.state;
    // const {mapViewState: {longitude, latitude}} = this.props;
    // const modelMatrix = new Matrix4().fromTranslation([0, 0, 1000 * index * separation]);
    const modelMatrix = new Matrix4()
      .fromTranslation([0, 0, 1000 * index * separation]);
    if (offsetMode) {
      modelMatrix.rotateZ(index * rotationZ * Math.PI);
      modelMatrix.rotateX(index * rotationX * Math.PI);
    }
    return modelMatrix;
  }

  _renderMap() {
    const {width, height, mapViewState, settings: {effects}} = this.state;
    return (
      <MapboxGLMap
        mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
        width={width} height={height}
        perspectiveEnabled
        { ...mapViewState }
        onChangeViewport={this._onViewportChanged}>

        <DeckGL
          debug
          id="default-deckgl-overlay"
          width={width} height={height}
          {...mapViewState}
          layers={this._renderExamples()}
        />

        <FPSStats isActive/>
      </MapboxGLMap>
    );
  }

  render() {
    const {settings, activeExamples} = this.state;

    return (
      <div>
        { this._renderMap() }
        <div id="control-panel">
          <LayerControls
            title="Composite Settings"
            settings={settings}
            onChange={this._onUpdateContainerSettings}/>
          <LayerSelector
            activeExamples={activeExamples}
            examples={LAYER_CATEGORIES}
            onToggleLayer={this._onToggleLayer}
            onUpdateLayer={this._onUpdateLayerSettings} />
        </div>
        <LayerInfo ref="infoPanel"/>
      </div>
    );
  }
}

// ---- Main ---- //

const container = document.createElement('div');
document.body.appendChild(container);

ReactDOM.render(<App />, container);