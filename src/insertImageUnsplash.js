/* eslint-disable no-undef */
import { Plugin } from 'ckeditor5/src/core';
import { ButtonView } from 'ckeditor5/src/ui';
import imageIcon from '../theme/icons/unsplash.svg';
import axios from 'axios';
import '../theme/modal.css';

let clientIDUnsplash = '';
let isBottom = false;
let photos = null;
let page = 1;
const numberOfPhotos = 30;
const maxPages = 5;

const addParameterToURL = ( baseUrl, param ) => {
	let _url = baseUrl;
	_url += ( _url.split( '?' )[ 1 ] ? '&' : '?' ) + param;
	return _url;
};

const simpleGet = async options => {
	try {
		const res = await axios.get( options.url );
		if ( options.onSuccess ) {
			options.onSuccess( res );
		}
	} catch ( error ) {
		console.log( 'err ', err );
		if ( options.onFailure ) {
			options.onFailure();
		}
	} finally {
		if ( options.onFinally ) {
			options.onFinally();
		}
	}
};

function searchPhotoByQuery( query, handleSelectImage ) {
	const randomUrl =
				'https://api.unsplash.com/photos/random/?count=' +
				numberOfPhotos +
				'&client_id=' +
				clientIDUnsplash;

	// use search
	const url =
				'https://api.unsplash.com/search/photos/?per_page=' +
				numberOfPhotos +
				'&page=' +
				page +
				'&client_id=' +
				clientIDUnsplash;
	const photosUrl = query ? `${ url }&query=${ query }` : randomUrl;

	if ( page === 1 || ( query && isBottom && page <= maxPages ) ) {
		const loading = document.createElement( 'p' );
		loading.innerText = 'Cargando...';
		const ulNode = document.getElementById( 'ckmk-photo-list' );
		ulNode.appendChild( loading );

		simpleGet( {
			url: photosUrl,
			onSuccess: res => {
				const photoFetched = Array.isArray( res.data ) ?
					res.data :
					res.data.results;
				if ( photos === null ) {
					photos = photoFetched;
				} else {
					photos = photos.concat( photoFetched );
				}

				if ( photoFetched.length > 0 ) {
					page += 1;
					isBottom = false;
				}
			},
			onFailure: () => {
				photos = [];
			},
			onFinally: () => {
				createLiInListHtml( document, photos, handleSelectImage );
			}
		} );
	}
}

function createLiInListHtml( document, photos = [], handleSelectImage ) {
	const ulNode = document.getElementById( 'ckmk-photo-list' );
	ulNode.innerHTML = '';
	photos.forEach( photo => {
		const li = document.createElement( 'li' );
		li.setAttribute( 'key', photo.id );
		li.innerHTML = `<img src=${ photo.urls.small } on />`;
		li.addEventListener( 'click', () => {
			handleSelectImage( photo );
		} );
		ulNode.appendChild( li );
	} );
}

function submitFormEvent( document, handleSelectImage ) {
	const form = document.querySelector( '#unsplash-search' );
	searchPhotoByQuery( '', handleSelectImage );
	form.addEventListener( 'submit', e => {
		e.preventDefault();
		const query = ( document.getElementById( 'ckmk-unsplash-search-input' ).value || '' ).trim();
		if ( query && query.length > 0 ) {
			page = 1;
			photos = null;
			searchPhotoByQuery( query, handleSelectImage );
		}
	} );
}

export default class InsertImageFromUnsplash extends Plugin {
	static get pluginName() {
		return 'InsertImageUnsplash';
	}

	init() {
		const editor = this.editor;
		const t = editor.t;
		clientIDUnsplash = editor.config.get( 'unsplash_client' );

		editor.ui.componentFactory.add( 'insertImageUnsplash', locale => {
			const view = new ButtonView( locale );

			view.set( {
				label: t( 'Find Image on Unsplash' ),
				icon: imageIcon,
				tooltip: true
			} );

			// Callback executed once the image is clicked.
			view.on( 'execute', () => {
				let modal = document.querySelector( '#ckmk-modal' );
				let modalOverlay = document.querySelector( '#ckmk-modal-overlay' );

				if ( modal ) {
					modal.classList.toggle( 'closed' );
					modalOverlay.classList.toggle( 'closed' );
					document.querySelector( 'body' ).style.overflow = modal.classList.contains( 'closed' ) ? 'visible' : 'hidden';
					document.getElementById( 'ckmk-unsplash-search-input' ).focus();
				} else {
					const ckmkModal = document.createElement( 'div' );
					ckmkModal.id = 'ckmk-modal-wrapper';
					ckmkModal.innerHTML = `<div class="ckmk-modal-overlay" id="ckmk-modal-overlay"></div>
					<div class="ckmk-modal" id="ckmk-modal" style="border-radius: 20px;">
						<a href="#" class="ckmk-close-button" id="ckmk-close-button"></a>
						<div class="modal-guts" style="border-radius: 20px;">
							<div id="unsplash-dna" class="ckmk-box">
								<form
									id="unsplash-search"
									class="unsplash-search form"
								>
									<input
										id="ckmk-unsplash-search-input"
										placeholder="${ t( 'Find Image on Unsplash' ) }"
										type="search"
										class="input"
										defaultValue=""
										style="margin-bottom: 20px;"
									/>
								</form>

								<ul id="ckmk-photo-list" class="ckmk-photo-grid"></ul>
							</div>
						</div>
					</div>`;

					document.body.appendChild( ckmkModal );

					document.querySelector( 'body' ).style.overflow = 'hidden';
					const closeButton = document.querySelector( '#ckmk-close-button' );
					modal = document.querySelector( '#ckmk-modal' );
					modalOverlay = document.querySelector( '#ckmk-modal-overlay' );

					closeButton.addEventListener( 'click', function( e ) {
						e.preventDefault();
						modal.classList.toggle( 'closed' );
						modalOverlay.classList.toggle( 'closed' );
						document.querySelector( 'body' ).style.overflow = 'visible';
					} );
				}

				const handleSelectImage = async photo => {
					if ( !photo.urls && !photo.urls.regular ) {
						return false;
					}

					let downloadLink = '';
					if ( photo.links ) {
						downloadLink = addParameterToURL(
							photo.links.download_location,
							'client_id=' + clientIDUnsplash
						);
						try {
							await axios.get( downloadLink );
						} catch ( error ) {
							console.log( 'ERR', error );
						}
					}

					editor.model.change( writer => {
						const imageElement = writer.createElement( 'imageBlock', {
							src: photo.urls.regular
						} );

						if ( photo.user ) {
							const { name, links } = photo.user;
							let link = links ? links.html : 'https://unsplash.com';
							link += '?utm_source=DNX&utm_medium=referral';

							const captionElment = writer.createElement( 'caption' );

							writer.appendText( `${ t( 'Photo by' ) } `, captionElment );
							writer.appendText( name, { linkHref: link }, captionElment );

							writer.appendText( ` ${ t( 'on' ) } `, captionElment );
							writer.appendText(
								'Unsplash',
								{
									linkHref:
									'https://unsplash.com/?utm_source=DNX&utm_medium=referral'
								},
								captionElment
							);
							// writer.appendElement(link, captionElment);

							writer.append( captionElment, imageElement );
						}

						// Insert the image in the current selection location.
						editor.model.insertContent(
							imageElement,
							editor.model.document.selection
						);
					} );

					modal.classList.toggle( 'closed' );
					modalOverlay.classList.toggle( 'closed' );
					document.querySelector( 'body' ).style.overflow = 'visible';
					return view;
				};

				submitFormEvent( document, handleSelectImage );
			} );

			return view;
		} );
	}
}
