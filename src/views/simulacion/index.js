import React, { Component } from 'react';
import { Layout , Modal ,Button, DatePicker, TimePicker, InputNumber, Spin } from 'antd';
import { TheContent, TheHeader } from '../../components/layout';
import { ComposableMap,ZoomableGroup,Geographies,Geography,Markers,Marker,Line,Lines} from 'react-simple-maps';
import ReactTooltip from 'react-tooltip';
import map from "./../../utils/files/world-50m-simplified.json";
import API from './../../Services/Api';
import moment from 'moment';
import ModalReporte from './ModalReporte';
import mathjs from 'mathjs';
var sem = require('semaphore')(1);

class Simulacion extends Component{
    constructor(props) {
        super(props);
        this.colorSelected = '#c7a602';
        this.colorCommon = '#3e3e3e';
        this.colorUnSelected = '#f5cc00';
        this.colorHover = '#607D8B';
        this.colorPressed = '#FF5722';
        this.frecRefreshSimu = 50;
        this.foo = new Date();
        this.listActions = [];
        this.maxStepConfig = 4; 
        this.state = {
            windowTime: 3*60*60 *1000, //El ultimo mil es porque es en milisegundos
            indexLoc: null,
            center: [0,20],
            zoom: 1,
            loading: 0,
            visibleModalConfig: false,
            tooltipConfig: null,
            myMap:null,
            frecTime: 120,
            intervalClock: null,
            intervalWindowClock: null,
            inPause: false,
            iniTime: 0,
            time: new Date().getTime(),
            realTime: 0,
            infoVuelos:[],
            archivo:{},
            stepConfig:1,

            infoCollapsed: {},
            errorConfig: false,
            locationInfo: [],
            selectedCountries: [],
            planVuelos:[
               /* {
                    fechaLlegada: 1543795200000,
                    oficinaSalida: "BOL",
                    oficinaLlegada: "PER",
                    fechaSalida: new Date().setHours(18,41,0,0),
                    tipo: "SALIDA",
                    cantidad: 100,
                    cantidadSalida: 25
                }*/
            ],
            paquetesEnviados: 0,
            showModalCollapsed: false,
            collapsed: false,

        }
        this.getLocationDef = this.getLocationDef.bind(this);
        this.buildCurves = this.buildCurves.bind(this);
        this.getContentModalCity = this.getContentModalCity.bind(this);
        this.handleClickGeography = this.handleClickGeography.bind(this);
        //Zoom the city
        this.isCountrySelected = this.isCountrySelected.bind(this);
        this.handleFrecTimeChange = this.handleFrecTimeChange.bind(this);
        this.tickClock = this.tickClock.bind(this);
        this.handleStartClock = this.handleStartClock.bind(this);
        this.handleTimeDateChange = this.handleTimeDateChange.bind(this);
        this.handleWindowTimeChange = this.handleWindowTimeChange.bind(this);
        this.sendRequestActions = this.sendRequestActions.bind(this);
    }
    componentWillMount(){
        setTimeout(()=>{
            ReactTooltip.rebuild()
        },100)  
    } 
    
    handleOpenModalConfig = (e) => {
        this.setState({
            visibleModalConfig: true,
        });
    }

    handleCancelModalConfig = (e) => {
        this.setState({
            visibleModalConfig: false,
        });
    }
    handleModalCollap = (e) => {
        this.setState({
            showModalCollapsed: false,
        });
    }
    contentConfigModal = (numStep) => {
        switch(numStep){
            case 1:
                return (
                    <div>
                        <strong><p>Paso {this.state.stepConfig} de {this.maxStepConfig}</p></strong>
                        <div className="title-config">Sube el archivo de ofinas o areropuertos</div>
                        <div style={{textAlign:'center'}}><input type="file" onChange={this.onChangeFileLoad} /></div>
                        {this.state.errorConfig ? <div style={{color:'#f5222d'}} className="error-config">Hubo un error al subir el archivo, intentelo de nuevo</div> : '' }
                    </div>
                );
            case 2:
                return (
                    <div>
                        <strong><p>Paso {this.state.stepConfig} de {this.maxStepConfig}</p></strong>
                        <div className="title-config">Sube el archivo de vuelos programados</div>
                        <div style={{textAlign:'center'}}><input type="file" onChange={this.onChangeFileLoad} /></div>
                        {this.state.errorConfig ? <div style={{color:'#f5222d'}} className="error-config">Hubo un error al subir el archivo, intentelo de nuevo</div> : '' }
                    </div>
                );  
            case 3:
                return (
                    <div>
                        <strong><p>Paso {this.state.stepConfig} de {this.maxStepConfig}</p></strong>
                        <div className="title-config">Sube el archivo de registro de paquetes</div>
                        <div style={{textAlign:'center'}}><input type="file" onChange={this.onChangeFileLoad} /></div>
                        {this.state.errorConfig ? <div style={{color:'#f5222d'}} className="error-config">Hubo un error al subir el archivo, intentelo de nuevo</div> : '' }
                    </div>
                );
            case 4:
                return (
                    <div>
                        <strong><p>Paso {this.state.stepConfig} de {this.maxStepConfig}</p></strong>
                        <div className="title-config">Establece la fecha inicial y la escala de tiempo</div>
                        <div>
                            Seleccione la fecha inicio: <DatePicker onChange={this.handleTimeDateChange} />
                        </div>
                        <div style={{marginTop:'1rem'}}>
                            Seleccione la hora inicio: <TimePicker onChange={this.handleTimeChange} defaultOpenValue={moment('00:00:00', 'HH:mm:ss')} />
                        </div>
                        <div style={{marginTop:'1rem'}}>
                            Multiplicador de velocidad: <InputNumber min={1} defaultValue={this.state.frecTime} onChange={this.handleFrecTimeChange} />x seg
                        </div>
                        <div style={{marginTop:'1rem'}}>
                            Intervalo de tiempo: <InputNumber min={1} defaultValue={this.state.windowTime} onChange={this.handleWindowTimeChange} />
                        </div>
                        <p>La velocidad se ve incrementada x<strong>{this.state.frecTime}</strong></p>
                    </div>
                );
        }
    } 
    
    handleOkModalConfig = (e) => {
        let urlApi = '';
        switch(this.state.stepConfig){
            case 1:
                urlApi = '/simulacion/oficinas/carga';
                break;
            case 2:
                urlApi = '/simulacion/vuelos/carga';
                break;
            case 3:
                urlApi = '/simulacion/paquetes/carga';
                break;
            case 4:
                urlApi = '';
                break;
        }
        console.log("envia",urlApi,this.state.archivo);
        if(urlApi != ''){
            API.post(urlApi, this.state.archivo)
            .then(response => {
                if(this.state.stepConfig == 1){
                    API.get('/simulacion/oficinas').then(response =>{
                        let selectedCountries = [];
                        let aux = [];
                        let mapIndexLoc = new Map();
                        response = response.data
                        for (let i = 0; i < response.length; i++) {
                            let obj = [];
                            response[i].cantidad = 0; //indica la cantidad  de paquetes que pasaron por el aeropuerto
                            obj.push(response[i].pais.codigoIso);
                            obj.push(response[i]);
                            mapIndexLoc.set(response[i].pais.codigoIso,i);
                            //selectedCountries.push(response[i].pais.codigoIso);
                            aux.push(obj);
                        }
                        this.setState({
                            indexLoc: mapIndexLoc,
                            myMap:new Map(aux),
                            locationInfo: response,
                            selectedCountries: selectedCountries,
                            stepConfig: this.state.stepConfig + 1,
                            visibleModalConfig: this.state.stepConfig == this.maxStepConfig ? false : true,
                            errorConfig : false,
                            archivo:{},
                        });
                      });
                }else{
                    this.setState({
                        stepConfig: this.state.stepConfig + 1,
                        visibleModalConfig: this.state.stepConfig == this.maxStepConfig ? false : true,
                        errorConfig : false,
                        archivo:{},
                    });
                }
            }).catch(response => {
                this.setState({
                    visibleModalConfig: true,
                    errorConfig : true,
                    archivo: {},
                });
            });
        }else{
            this.setState({
                stepConfig: this.state.stepConfig + 1,
                visibleModalConfig: this.state.stepConfig == this.maxStepConfig ? false : true,
                archivo:{},
            });
        }
    }
    onChangeFileLoad = e => {
        let file = e.target.files[0];
        let formData = new FormData();
        formData.append("file", file);
        this.setState({
            archivo: formData
        });
    };  
    handleWindowTimeChange(value){
        this.setState({
            windowTime: value,
        });
    }
    handleTimeDateChange(objData, dataString){
      let newTimeArr = dataString.split("-");
      let newDateTime = new Date(parseInt(newTimeArr[0]),parseInt(newTimeArr[1]-1),parseInt(newTimeArr[2]));
      this.setState({
        time: newDateTime.getTime(),
        realTime: newDateTime.getTime(),
      });
    }
    handleTimeChange = (objTime, timeString) => {
        let newTimeArr = timeString.split(":");
        let newDateTime = new Date(this.state.time);
        newDateTime.setHours(parseInt(newTimeArr[0]),parseInt(newTimeArr[1]),parseInt(newTimeArr[2]));
        console.log("eee real",newDateTime);
        this.setState({
            iniTime: newDateTime.getTime(),
            time: newDateTime.getTime(),
            realTime: newDateTime.getTime(),
        });
    }
    handleFrecTimeChange(value){
      this.setState({
        frecTime: value,
      });
    }
    
    tickClock(){
      let oldTime = this.state.time;
      let newTime = this.state.time + this.frecRefreshSimu*this.state.frecTime;
      //Ini: Calculos que se deben hacer por cada tick del reloj
      let auxLocationInfo = [...this.state.locationInfo];
      let auxIndex = this.state.indexLoc;
      let auxPlanesNew = [];
      let esTemprano = true;
      let obj;
      let idx;
      let isCollapsed = false;
      let infoCollapsedFull  = {}
      let objInfoCollap = {};
      while(this.listActions.length != 0 && esTemprano){
        if(this.listActions[0].fechaSalida < this.state.time){
            sem.take(()=>{
                obj = this.listActions.shift();
                sem.leave();

                if(obj.tipo == "REGISTRO"){
                    idx = auxIndex.get(obj.oficinaLlegada);
                    auxLocationInfo[idx].capacidadActual++;
                    auxLocationInfo[idx].cantidad++;
                    if(auxLocationInfo[idx].capacidadActual > auxLocationInfo[idx].capacidadMaxima){
                        isCollapsed = true;
                        objInfoCollap = {code: auxLocationInfo[idx].codigo,  maxCap:auxLocationInfo[idx].capacidadMaxima }
                    }
                    console.log("R");
                }else if(obj.tipo == "SALIDA"){
                    auxPlanesNew.push(obj);
                    idx = auxIndex.get(obj.oficinaLlegada);
                    auxLocationInfo[idx].capacidadActual -= obj.cantidad;
                    console.log("S");
                }
            });
            
        }else{
          esTemprano = false;
        }
      }

      //manejar vuelos terminados
      let liveFlights = this.state.planVuelos.filter(e => e.fechaLlegada > newTime );
      let finishedFlights = this.state.planVuelos.filter(e => e.fechaLlegada <= newTime );
      let acumSalida = 0;

      for(let delElem of finishedFlights){
        let idxDel = auxIndex.get(delElem.oficinaSalida);
        if(auxLocationInfo[idxDel].capacidadActual + delElem.cantidad > auxLocationInfo[idxDel].capacidadMaxima){
            isCollapsed = true;
            objInfoCollap = {code: auxLocationInfo[idxDel].codigo , maxCap: auxLocationInfo[idxDel].capacidadMaxima}
        }
        auxLocationInfo[idxDel].capacidadActual += delElem.cantidad - delElem.cantidadSalida;
        auxLocationInfo[idxDel].cantidad += delElem.cantidad;
        acumSalida += delElem.cantidadSalida;
      }
      if(isCollapsed){
        console.log("COLLAPSED!!!",isCollapsed,objInfoCollap)
        infoCollapsedFull = {
            fechaInicial: this.state.iniTime,
            duracionTotal: this.state.realTime - this.state.iniTime,
            almacenColapso: objInfoCollap.code,
            cantidadAumento: objInfoCollap.maxCap*1.1,
            paquetesEnviados: this.state.paquetesEnviados,
            oficinas: auxLocationInfo
        }
        clearInterval(this.state.intervalClock);
        clearInterval(this.state.intervalWindowClock);
      }
      this.setState({
        locationInfo: auxLocationInfo,
        time: newTime,
        planVuelos: liveFlights.concat(auxPlanesNew),
        infoCollapsed: infoCollapsedFull,   
        collapsed: isCollapsed,
        paquetesEnviados :acumSalida + this.state.paquetesEnviados,
        showModalCollapsed: true,
      });
      //Fin
    }

    sendRequestActions(){
        console.log("pide a las ", new Date(this.state.time));
        API.post('simulacion/window',
            {
            simulacion:  1, 
            inicio: new Date(this.state.realTime - 5*60*60*1000), //2018-04-16T19:01:00 
            fin: new Date(this.state.realTime + this.state.windowTime - 5*60*60*1000), //2018-04-20T03:01:00
            }
        ).then(resp => {
            if(resp.data.status == 0){ // sigo pidiendo
                sem.take(()=>{
                    this.listActions = this.listActions.concat(resp.data.listActions);
                    sem.leave();
                });
                this.setState({
                    realTime: this.state.realTime + this.state.windowTime
                });
            }else{
                clearInterval(this.state.intervalWindowClock);
                this.setState({
                    realTime: this.state.realTime + this.state.windowTime,
                    intervalWindowClock: null,
                })
            }
        });
    }
    handleStartClock(){
      if(this.state.intervalClock){
        console.log(">>",this.state.intervalClock);
      }else{
        console.log("pide a las ", new Date(this.state.time));
        this.setState({
            loading: 1,
        }, () => {
            API.post('simulacion/window',
                {
                simulacion:  1, 
                inicio: new Date(this.state.realTime - 5*60*60*1000), //2018-04-16T19:01:00 
                fin: new Date(this.state.realTime + this.state.windowTime - 5*60*60*1000), //2018-04-20T03:01:00
                }
            ).then(resp => {
                if(resp.data.status == 0){
                    sem.take(()=>{
                        this.listActions = this.listActions.concat(resp.data.listActions);
                        sem.leave();
                        let intClock = setInterval(
                            () => this.tickClock()
                            ,this.frecRefreshSimu); 
                
                        let intWindowClock = setInterval(
                            () => this.sendRequestActions()
                            ,Math.floor(this.state.windowTime/this.state.frecTime));

                        this.setState({
                            realTime: this.state.realTime + this.state.windowTime,
                            intervalClock: intClock,
                            intervalWindowClock: intWindowClock,
                            inPause: false,
                            loading: 0,
                        })
                    });
                }else{
                    console.log("HA OCURRIDO UN ERROR EN LA PRIMERA VENTANA DE TIEMPO");
                }
            });
        });
      }
    }
    handleReplay = () => {
        let intClock = setInterval(
            () => this.tickClock()
            ,this.frecRefreshSimu); 
  
        let intWindowClock = setInterval(
            () => this.sendRequestActions()
            ,Math.floor(this.state.windowTime/this.state.frecTime));

        this.setState({
            intervalClock: intClock,
            intervalWindowClock: intWindowClock,
            inPause: false,
        });
    }
    handlePause = () => {
          clearInterval(this.state.intervalClock);
          clearInterval(this.state.intervalWindowClock);

          this.setState({
              intervalClock: null,
              intervalWindowClock: null,
              inPause: true,
          });
    }

    isCountrySelected(elem){
        return this.state.selectedCountries.includes(elem);
    }

    handleClickGeography(geo,evt){
        let objLoc = this.getLocationDef(geo);
        if(objLoc){
            if(this.isCountrySelected(geo.properties.ISO_A3)){
                this.setState({
                    selectedCountries: this.state.selectedCountries.filter(e => e != geo.properties.ISO_A3)
                })
            }else{
                this.setState({
                    selectedCountries: [...this.state.selectedCountries,geo.properties.ISO_A3]
                })
            }
        }
    }
    getLocationDef(obj){
        let objLoc = this.state.locationInfo.find(e => e.pais.codigoIso == obj.properties.ISO_A3);
        if(objLoc){
            return objLoc;
        }
        return false;
    }
    buildCurves(start, end, line) {
        const x0 = start[0];
        const x1 = end[0];
        const y0 = start[1];
        const y1 = end[1];
        const curve = {
          forceUp: `${x1} ${y0}`,
          forceDown: `${x0} ${y1}`
        }['forceDown'];
        return `M ${start.join(' ')} Q ${curve} ${end.join(' ')}`;
    }

    getContentModalCity(item){
        if(item){
            let elem = JSON.parse(item);
            let infoObj = this.getLocationDef(elem);
            
            if(infoObj){
                return (
                    <div>{elem.properties.NAME_ES + " - " +elem.properties.ISO_A3 +" - " + infoObj.codigo }
                        <div>{"Capacidad: " + infoObj.capacidadActual + "/" + infoObj.capacidadMaxima}</div>
                    </div>
                )
            }else{
                return (
                    <div>{elem.properties.NAME_ES}</div>
                )
            }  
        }
    } 

    getHexColor = (max, act) => {
        let esc = Math.round(255*act/max);
        
        let p1 = Number(esc).toString(16).padStart(2, "0");
        let p2 = Number(118).toString(16).padStart(2, "0");
        let p3 = Number(118).toString(16).padStart(2, "0");

        return '#'+p1+p2+p3;
    }
    render(){
        const {loading, locationInfo, planVuelos, windowTime, frecTime ,selectedCountries, inPause ,collapsed,infoCollapsed, showModalCollapsed,time} = this.state;
        let objTime = new Date(this.state.time);
        return(
            <Layout>
            <TheHeader>
                <h1> Simulación</h1>
                
            </TheHeader>
            <TheContent>
            {loading == 1 ? <div style={{position:'fixed', top:'50%',left:'50%'}}><Spin /></div> : '' }
            <div>
            {objTime.toLocaleString()}
            {collapsed && showModalCollapsed? <ModalReporte onHandleClose={this.handleModalCollap} info={infoCollapsed}/> : ""}
            </div>
            <Button type="primary" onClick={this.state.stepConfig > this.maxStepConfig? this.handleStartClock : this.handleOpenModalConfig}>
                {this.state.stepConfig > this.maxStepConfig? "Iniciar simulación" : "Establecer Configuraciones" }
            </Button>
            { inPause ?
                <Button onClick={this.handleReplay}>Reanudar</Button>
                :
                <Button onClick={this.handlePause}>Pausar</Button>
            }
            <Modal
                title="Configuración de la simulación"
                visible={this.state.visibleModalConfig}
                onOk={this.handleOkModalConfig}
                onCancel={this.handleCancelModalConfig}
            >
                {this.contentConfigModal(this.state.stepConfig)}
            </Modal>
            <ComposableMap
                        className="mapa"
                        projectionConfig={{
                            scale: 165,
                            rotation: [-10,0,0],
                    }}>
                <ZoomableGroup center={this.state.center} zoom={this.state.zoom}>
                <Geographies geography={map}
                        disableOptimization={true}>
                    {(geographies, projection) => geographies.map((geography,index) => (
                    <Geography
                        key={index}
                        geography={geography}
                        projection={projection}
                        data-for='modal-city'
                        data-tip={JSON.stringify(geography)}
                        onClick={this.handleClickGeography}
                        style={{
                        default: {
                            fill: this.getLocationDef(geography) ? this.getHexColor(this.getLocationDef(geography).capacidadMaxima,this.getLocationDef(geography).capacidadActual) : "#607D8B",
                            //fill: "#607D8B",
                            stroke: this.getLocationDef(geography) ? (this.isCountrySelected(geography.properties.ISO_A3) ? this.colorSelected : this.colorUnSelected ) :  this.colorCommon,
                            strokeWidth: 1.5,
                            outline: "none",
                        },
                        hover: {
                            fill: this.colorHover,
                            stroke: "#607D8B",
                            strokeWidth: 0.75,
                            outline: "none",
                        },
                        pressed: {
                            fill: this.colorPressed,
                            stroke: "#607D8B",
                            strokeWidth: 0.75,
                            outline: "none",
                        },
                        }}
                    />
                    ))
                }
                </Geographies>
                <Markers>
                        {/*locationInfo.map((item, i) => { 
                            return (
                                    <Marker key={i} 
                                            marker={{ coordinates: [ item.pais.longitud, item.pais.latitud ] }}
                                            preserveMarkerAspect={false}
                                            style={{
                                                default: { fill: "#0000007a" },
                                                hover:   { fill: "#999" },
                                                pressed: { fill: "#000" },
                                              }}
                                            >                                      
                                        <circle cx={ 0 } cy={ 0 } r={ 1 } />                              
                                    </Marker>);
                        })*/}
                        {
                            planVuelos.map((item,i)=>{
                            let salida =this.state.myMap.get(item.oficinaSalida);
                            let llegada=this.state.myMap.get(item.oficinaLlegada);
                            //item.fechaLlegada, item.fechaSalida
                            /*let salida ={
                                pais:{
                                    longitud: -75.015152,
                                    latitud: -9.1899672
                                }
                            }
                            let llegada ={
                                pais:{
                                    longitud: -3.70325,
                                    latitud:40.4167
                                }
                            }
                            */
                            let distX = mathjs.distance({pointOneX: salida.pais.longitud, pointOneY: 0},{pointTwoX: llegada.pais.longitud, pointTwoY: 0});
                            let distY = mathjs.distance({pointOneX: salida.pais.latitud, pointOneY: 0},{pointTwoX: llegada.pais.latitud, pointTwoY: 0});
                            let auxTime = time > item.fechaLlegada ? item.fechaLlegada : time;

                            let segX = (auxTime - item.fechaSalida) * (distX)/(item.fechaLlegada - item.fechaSalida);
                            let segY = (auxTime - item.fechaSalida) * (distY)/(item.fechaLlegada - item.fechaSalida) 


                            let xPoint = (llegada.pais.longitud > salida.pais.longitud ? salida.pais.longitud + segX : salida.pais.longitud - segX );
                            let yPoint = (llegada.pais.latitud > salida.pais.latitud ? salida.pais.latitud + segY : salida.pais.latitud - segY);
                            console.log(xPoint,yPoint);
                            return(
                                <Marker
                                    key={i}
                                    marker={{ coordinates: [ xPoint, yPoint ] }}
                                    preserveMarkerAspect={false}
                                    style={{
                                        default: { fill: "#000" },
                                        hover:   { fill: "#999" },
                                        pressed: { fill: "#000" },
                                        }}
                                >
                                    <circle cx={ 0 } cy={ 0 } r={ 1 } />     
                                </Marker> 
                            )
                        })}
                </Markers>  
                {/*<Lines>
                  {planVuelos.filter(
                      pv => 
                        (selectedCountries.includes(pv.oficinaLlegada) 
                            || selectedCountries.includes(pv.oficinaSalida))
                        ).map((item,i)=>{
                    let salida =this.state.myMap.get(item.oficinaSalida);
                    let llegada=this.state.myMap.get(item.oficinaLlegada);
                    return(
                      <Line
                        key={i}
                        className="world-map-arc"
                        line={{
                                coordinates: {
                                    start: [salida.pais.longitud,salida.pais.latitud],
                                    end: [llegada.pais.longitud, llegada.pais.latitud]
                                }
                        }}
                        preserveMarkerAspect={false}
                        buildPath={this.buildCurves}
                        style={{
                            default: { stroke: "#FF4233" },
                            hover:   { stroke: "#999" },
                            pressed: { stroke: "#000" },
                          }}
                      />
                    )
                  })}
                </Lines>*/}
              </ZoomableGroup>
            </ComposableMap>
            <ReactTooltip id='modal-city'
                getContent={this.getContentModalCity}
            />
            
            </TheContent>
            </Layout>
        );
    }
}

export default Simulacion;