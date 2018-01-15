import { Component, ViewChild, ViewContainerRef } from '@angular/core';

import * as json from './form-dataproperties.json';

import { NewPersonComponent } from './newperson/newperson.component';
import { DataFormService } from './newperson/dataform.service';
import { DumpDataService } from '../../shared/services/dumpdata';
import { slideToLeft } from '../../shared/animations/router.animations';
import { FormService } from '../../../components/form';
@Component( {
  selector: 'app-modal',
  templateUrl: './formdemo.component.html',
  animations: [ slideToLeft() ],
  styleUrls: [ './formdemo.component.scss' ]
} )
export class FormDemoComponent {

  @ViewChild( 'containerModal' ) containerModal;

  public index: number;

  public formprop;

  public result;

  public data;

  constructor(public view: ViewContainerRef, public formService: FormService,
              public dataFormService: DataFormService,  public dataDumpService: DumpDataService) {
    this.formService.setView(view);
    this.data = this.dataDumpService.createRandomData( 100 );
    this.formprop = json.dataProperties;
  }

  form1(parent) {
    this.formService.createForm(NewPersonComponent, parent, (modalResult) => {
      this.dataFormService.saveDataForm(modalResult.formResult);
      this.result = this.dataFormService.getDataForm();
    });
  }

}
