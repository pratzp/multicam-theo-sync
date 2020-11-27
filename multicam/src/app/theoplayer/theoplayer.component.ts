import { AfterViewInit, Component, OnInit } from '@angular/core';

declare var MultiCamPlayers: any;
@Component({
  selector: 'app-theoplayer',
  templateUrl: './theoplayer.component.html',
  styleUrls: ['./theoplayer.component.scss']
})
export class TheoplayerComponent implements OnInit, AfterViewInit {

  constructor() { }
  public static readonly QUERY_PRIMARY = '?rays=ebcdf';
  public static readonly QUERY_SECONDARY = '?rays=cbdef';
  config = {};

  ngOnInit(): void {
    this.config = {
      primary: 'https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8' +
       (TheoplayerComponent.QUERY_PRIMARY ? TheoplayerComponent.QUERY_PRIMARY : ''),
      secondaries: [
          'https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8' +
           (TheoplayerComponent.QUERY_SECONDARY ? TheoplayerComponent.QUERY_SECONDARY : ''),
          'https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8' +
           (TheoplayerComponent.QUERY_SECONDARY ? TheoplayerComponent.QUERY_SECONDARY : ''),
          'https://content.uplynk.com/044b9f180b4249f88b02231f13110239.m3u8' +
           (TheoplayerComponent.QUERY_SECONDARY ? TheoplayerComponent.QUERY_SECONDARY : '')
      ]
    };
  }

  ngAfterViewInit(): void {
    MultiCamPlayers.createPlayers(this.config);
  }
}
