/*
 MIT License

 Copyright (c) 2018 Temainfo Software

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */
import {
  AfterViewInit, Component, ComponentRef, ElementRef, EventEmitter,
  HostBinding,
  Input, NgZone, OnDestroy, OnInit, Output, Renderer2, ViewChild, ViewContainerRef
} from '@angular/core';
import { ContainerModalService } from './addons/container-modal/container-modal.service';
import { ModalService } from './modal.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { ModalResult } from '../core/enums/modal-result';
import { ModalOptions } from './modal-options';
import { SidebarService } from './sidebar.service';

let subscribeMouseMove;

@Component( {
  selector: 'tl-modal',
  templateUrl: './modal.html',
  styleUrls: [ './modal.scss' ],
  animations: [
    trigger(
      'enterAnimation', [
        transition( ':enter', [
          style( { opacity: 0 } ),
        ] ),
        transition( ':leave', [
          style( { opacity: 1 } ),
          animate( '100ms', style( { opacity: 0 } ) )
        ] )
      ]
    )
  ]
} )
export class TlModal implements OnInit, AfterViewInit, ModalOptions, OnDestroy {

  @Input() draggable = true;

  @Input() minimizable = true;

  @Input() maximizable = true;

  @Input() closable = true;

  @Input() icon = '';

  @Input() title = 'My Modal';

  @Input() color = 'basic';

  @Input() height = '500px';

  @Input() width = '500px';

  @Input() fullscreen = false;

  @Input() restoreMaximize = true;

  @Input() backdrop = false;

  @Input() closeShortcut = 'escape';

  @Input() restoreShortcut = '';

  @Input() maximizeShortcut = '';

  @Input() parentElement;

  @ViewChild( 'headerBox' ) headerBox: ElementRef;

  @ViewChild( 'modal' ) modal: ElementRef;

  @ViewChild( 'body', { read: ViewContainerRef } ) body: ViewContainerRef;

  @HostBinding( '@enterAnimation' ) public animation;

  @Output() show: EventEmitter<any> = new EventEmitter();

  @Output() minimize: EventEmitter<any> = new EventEmitter();

  @Output() maximize: EventEmitter<any> = new EventEmitter();

  @Output() close: EventEmitter<any> = new EventEmitter();

  public componentRef: ComponentRef<TlModal>;

  public modalResult;

  public status = '';

  public index;

  public serviceControl: ModalService;

  public maximized = false;

  private mousePressX;

  private mousePressY;

  private positionMouseMoveX;

  private positionMouseMoveY;

  private moving = false;

  private offsetLeftContent;

  private offsetTopContent;

  private offsetLeftModal;

  private offsetTopModal;

  private parent;

  private modalLeft;

  private modalTop;

  private positionX;

  private positionY;

  private subscribeResize;

  constructor( private element: ElementRef, private renderer: Renderer2,
               private containerService: ContainerModalService,
               private sidebarService: SidebarService, private zone: NgZone ) {
  }

  ngOnInit() {
    this.listenSidebarChange();
    this.resizeListener();
    this.validateProperty();
    this.show.emit();
  }

  ngAfterViewInit() {
    this.getBoundingContent();
    this.setDefaultDimensions();
    this.validateMeasureParentAndModal();
    this.handleInitialPositionModal();
    this.handleFullscreen();
  }

  listenSidebarChange() {
    this.sidebarService.sidebarChange.subscribe(() => {
      this.handleChangeSidebarWhenMaximized();
    });
  }

  handleChangeSidebarWhenMaximized() {
    setTimeout( () => {
      this.getBoundingContent();
      this.setPosition();
      this.handleInitialPositionModal();
      this.setOffsetLeftModal( this.modal.nativeElement.getBoundingClientRect().left );
      this.setOffsetTopModal( this.modal.nativeElement.getBoundingClientRect().top );
      if ( this.maximized ) {
        this.maximized = false;
        this.maximizeModal();
      }
    }, 250 );
  }

  handleInitialPositionModal() {
    this.setModalCenterWindow();
  }

  handleFullscreen() {
    setTimeout( () => {
      if ( this.fullscreen ) {
        this.maximizeModal();
      }
    }, 1 );
  }

  resizeListener() {
    this.subscribeResize = this.renderer.listen( window, 'resize', () => {
      this.getBoundingContent();
      this.setModalCenterWindow();
      this.maximizeModal();
    } );
  }

  addTransitionModal() {
    this.renderer.setStyle(this.modal.nativeElement, 'transition', 'all 150ms ease-in-out');
  }

  mousemoveListener() {
    this.removeTransitionModal();
    this.zone.runOutsideAngular( () => {
      subscribeMouseMove = this.renderer.listen( window, 'mousemove', ( event ) => {
        if ( !( this.moving && this.draggable) ) {
          return;
        }
        if ( this.isMouseOutOfTheWindowRight( event ) ) {
          this.setOffsetLeftModal( window.innerWidth - this.modal.nativeElement.offsetWidth );
          this.setMousePressX( window.innerWidth );
        }
        if ( this.isMouseOutOfTheWindowLeft( event ) ) {
          this.setOffsetLeftModal( this.getBoundingParentElement().left );
          this.setMousePressX( this.getBoundingParentElement().left );
        }
        this.positionMouseMoveX = event.clientX;
        this.positionMouseMoveY = event.clientY;
        this.setPosition();
      } );
    } );
  }

  mouseupListener() {
    if (subscribeMouseMove) {
      subscribeMouseMove();
    }
    this.addTransitionModal();
    this.moving = false;
  }

  removeTransitionModal() {
    this.renderer.removeStyle(this.modal.nativeElement, 'transition');
  }

  mouseDown( $event ) {
    if ( !this.maximized ) {
      this.setOffsetLeftModal( this.modal.nativeElement.getBoundingClientRect().left );
      this.setOffsetTopModal( this.modal.nativeElement.getBoundingClientRect().top );
      this.setMousePressX( $event.clientX );
      this.setMousePressY( $event.clientY );
      this.moving = true;
    }
  }

  validateProperty() {
    if ( !this.restoreMaximize && !this.fullscreen ) {
      throw new EvalError( 'The [restoreMaximize] property require [fullscreen] property as TRUE.' );
    }
  }

  validateMeasureParentAndModal() {
    if ( (this.parent.offsetWidth < this.modal.nativeElement.offsetWidth) ||
      (this.parent.offsetHeight < this.modal.nativeElement.offsetHeight) ) {
      console.warn( 'The Width or Height of Parent Element are less than Width or Height of Modal, ' +
        'this could result in glitches and not working as expected.' );
    }
  }

  getModalPosition() {
    this.modalLeft = this.modal.nativeElement.offsetLeft;
    this.modalTop = this.modal.nativeElement.offsetTop;
  }

  setModalCenterParent() {
    this.modal.nativeElement.style.left = this.offsetLeftContent + (this.parent.offsetWidth / 2)
      - (this.modal.nativeElement.offsetWidth / 2) + 'px';
    this.modal.nativeElement.style.top = (this.offsetTopContent)
      + (this.parent.offsetHeight / 2) - (this.modal.nativeElement.offsetHeight / 2) + 'px';
  }

  setModalCenterWindow() {
    this.modal.nativeElement.style.left = (window.innerWidth / 2) -
      (this.modal.nativeElement.offsetWidth / 2) + 'px';
    this.modal.nativeElement.style.top = (window.innerHeight / 2) -
      (this.modal.nativeElement.offsetHeight / 2) + 'px';
  }

  setComponentRef( component: ComponentRef<TlModal> ) {
    this.componentRef = component;
  }

  setMousePressX( position ) {
    this.mousePressX = position;
  }

  setMousePressY( position ) {
    this.mousePressY = position;
  }

  setPosition() {
    this.setLeftPosition();
    this.setTopPosition();
    this.setDefaultDimensions();
  }

  setLeftPosition() {
    if ( this.isOutOfWindowX() ) {
      return this.setLeftLimitOfArea();
    }

    if ( this.isOutOfWindowOnLeft() ) {
      return this.setContentLeftPosition();
    }

    this.setNewLeftPosition();
  }

  setTopPosition() {
    if ( this.isOutOfWindowY() ) {
      return this.setTopLimitOfArea();
    }

    if ( this.isOutOfWindowOnTop() ) {
      return this.setContentTopPosition();
    }

    this.setNewTopPosition();
  }

  setOptions( options: Array<ModalOptions> ) {
    const self = this;
    Object.keys( options ).forEach( function ( key ) {
      self[ key ] = options[ key ];
    } );
  }

  setLeftLimitOfArea() {
    return this.modal.nativeElement.style.left =
      (this.parent.offsetWidth - this.modal.nativeElement.offsetWidth) + this.offsetLeftContent + 'px';
  }

  setTopLimitOfArea() {
    return this.modal.nativeElement.style.top =
      (this.parent.offsetHeight - this.modal.nativeElement.offsetHeight) + (this.offsetTopContent) + 'px';
  }

  setOffsetLeftModal( offset ) {
    this.offsetLeftModal = offset;
  }

  setOffsetTopModal( offset ) {
    this.offsetTopModal = offset;
  }

  setContentTopPosition() {
    this.modal.nativeElement.style.top = this.offsetTopContent + 'px';
  }

  setContentLeftPosition() {
    this.modal.nativeElement.style.left = this.offsetLeftContent + 'px';
  }

  setNewTopPosition() {
    this.modal.nativeElement.style.top = this.offsetTopModal + this.positionMouseMoveY - this.mousePressY + 'px';
  }

  setNewLeftPosition() {
    this.modal.nativeElement.style.left = this.offsetLeftModal + this.positionMouseMoveX - this.mousePressX + 'px';
  }

  setServiceControl( service ) {
    this.serviceControl = service;
  }

  setDefaultDimensions() {
    if ( this.height && this.width ) {
      this.modal.nativeElement.style.height = this.height;
      this.modal.nativeElement.style.width = this.width;
    } else {
      this.modal.nativeElement.style.height = '500px';
      this.modal.nativeElement.style.width = '500px';
    }
  }

  setCurrentPosition() {
    this.modal.nativeElement.style.left = this.modalLeft + 'px';
    this.modal.nativeElement.style.top = this.modalTop + 'px';
  }

  isMouseOutOfTheWindowLeft( event ) {
    return event.clientX < this.offsetLeftContent;
  }

  setZIndex() {
    this.serviceControl.setZIndex( this.componentRef, this.modal );
    this.serviceControl.sortComponentsByZIndex();
  }

  isMouseOutOfTheWindowRight( event ) {
    return event.clientX >= window.innerWidth - 1;
  }

  isOutOfWindowOnLeft() {
    return this.positionX < this.offsetLeftContent;
  }

  isOutOfWindowOnTop() {
    return this.positionY < this.offsetTopContent;
  }

  isOutOfWindowX() {
    this.positionX = this.offsetLeftModal + this.positionMouseMoveX - this.mousePressX;
    return this.positionX >= (this.parent.offsetWidth - this.modal.nativeElement.offsetWidth) + this.offsetLeftContent;
  }

  isOutOfWindowY() {
    this.positionY = this.offsetTopModal + this.positionMouseMoveY - this.mousePressY;
    return this.positionY >= ((this.parent.offsetHeight - this.modal.nativeElement.offsetHeight) + this.offsetTopContent);
  }

  minimizeModal() {
    if ( !(this.minimizable) ) {
      return;
    }
    this.serviceControl.minimize( this.componentRef );
    this.minimize.emit( this.componentRef.instance );
  }

  closeModal() {
    if ( this.closable ) {
      this.serviceControl.execCallBack( ModalResult.MRCLOSE, this.componentRef );
      this.close.emit( this.componentRef.instance );
    }
  }

  maximizeModal() {
    if ( !(this.maximizable) ) {
      return;
    }
    if ( !this.maximized ) {
      this.getModalPosition();
      this.setModalLeftPosition();
      this.setModalTopPosition();
      this.setModalWidth();
      this.setModalHeight();
      this.maximized = true;
      this.moving = false;
      this.maximize.emit();
      return;
    }
    this.restoreMaximizeModal();
  }


  setModalLeftPosition() {
    this.modal.nativeElement.style.left = this.getBoundingParentElement().left + 'px';
  }

  setModalTopPosition() {
    this.modal.nativeElement.style.top = this.getBoundingParentElement().top +
      (this.hasScroll() ? window.scrollY : 0) + 'px';
  }

  setModalWidth() {
    this.modal.nativeElement.style.width = this.getBoundingParentElement().width + 'px';
  }

  setModalHeight() {
    this.modal.nativeElement.style.height = this.hasScroll() ? this.getHeightOfWindow() :
      this.getBoundingParentElement().height + 'px';
  }

  getHeightOfWindow() {
    return (window.innerHeight - this.modal.nativeElement.offsetTop) + 'px';
  }

  hasScroll() {
    return (!this.parentElement) && (this.parent.offsetHeight > window.innerHeight);
  }

  restoreMaximizeModal() {
    if ( this.restoreMaximize ) {
      this.setDefaultDimensions();
      this.setCurrentPosition();
      this.maximized = false;
    }
  }

  getBoundingParentElement() {
    return this.parent.getBoundingClientRect();
  }

  getBoundingContent() {
    this.parent = this.containerService.getView().element.nativeElement;
    this.offsetLeftContent = this.parent.getBoundingClientRect().left;
    this.offsetTopContent = this.parent.getBoundingClientRect().top;
  }

  ngOnDestroy() {
    this.subscribeResize();
  }

}

