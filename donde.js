/*!
 * donde.js 0.1
 * Copyright 2013 Agustin Diaz @hiroagustin
 * Released under the MIT license
 */
;(function (document, window, undefined)
{
  'use strict';

  var defaultOptions = {
        idMap: 'map'
      , zoom: 15
      , defaultLocation: {
          latitude: -34.8937720817105
        , longitude: -56.1659574508667
        }
      , image: {
          width: 37
        , height: 34
        }
      }

    , Donde = function Donde (options)
      {
        this.options = Utils.extend({}, defaultOptions, options);
        this.markers = this.options.markers;
        
        return this;
      }

    , Utils = {
        // Podriamos hacer que Utils se encargue del for in
        // hay que hacer un each :p
        each: function (obj, iterator, context)
        {
          if (!obj)
          {
            return;
          }

          if (obj.forEach === Array.prototype.forEach)
          {
            obj.forEach(iterator, context);
          }
          else if (obj instanceof Array)
          {
            for (var i = 0; i < obj.length; i++)
            {
              iterator.call(context, obj[i], i);
            }
          }
          else
          {
            for (var key in obj)
            {
              if (obj.hasOwnProperty(key))
              {
                iterator.call(context, obj[key], key);
              }
            }
          }
        }

      , extend: function (obj)
        {
          var self = this
            , extensions = Array.prototype.slice.call(arguments, 1);

          this.each(extensions, function (extension)
          {
            self.each(extension, function (value, key)
            {
              obj[key] = value;
            });
          });

          return obj;
        }
      };

  Utils.extend(Donde.prototype, {

    createMap: function (container)
    {
      return new google.maps.Map(container, {
        mapTypeId: google.maps.MapTypeId.ROADMAP
      , streetViewControl: false
      , mapTypeControl: false
      , zoom: this.options.zoom
      });
    }

  , createMarker: function (marker)
    {
      marker = marker || {};

      return new google.maps.Marker({
        icon: marker.icon
      , map: this.map
      , position: this.toLatLng(marker)
      });
    }

  , toLatLng: function (position)
    {
      return position instanceof google.maps.LatLng ?
        position : new google.maps.LatLng(
          position.latitude, position.longitude
        );
    }

  , setInitialPosition: function (position)
    {
      this.initialPosition = this.toLatLng(position);
      
      this.map.setCenter(this.initialPosition);
      this.userLocationMarker.setPosition(this.initialPosition);

      return this;
    }

  , handleInitialLocationError: function ()
    {
      this.setInitialPosition(this.options.defaultLocation);
      this.options.errorMessage && alert(this.options.errorMessage);

      return this.notify('Initial location not found.');
    }

  , notify: function (message)
    {
      alert(message);

      return this;
    }

  , panToPosition: function (position)
    {
      this.map.panTo(this.toLatLng(position));

      return this;
    }

  , panToInitialPosition: function ()
    {
      return this.panToPosition(this.initialPosition);
    }

  , addMarker: function (marker)
    {
      if (!(marker.type in this.groups))
      {
        this.groups[marker.type] = {};
      }

      if (!this.groups[marker.type].markers)
      {
        this.groups[marker.type].markers = [];
      }

      marker.icon = this.groups[marker.type].icon;

      this.groups[marker.type].markers.push(
        this.createMarker(marker)
      );

      return this;
    }

  , getUserPosition: function ()
    {
      var self = this;

      navigator.geolocation.getCurrentPosition(
        function (position)
        {
          self.setInitialPosition(position.coords);
        }
      , function ()
        {
          self.handleInitialLocationError(arguments);
        }
      , {
          enableHighAccuracy: true
        , timeout: 8000
        }
      );

      return this;
    }

  , mapAttributes: function (marker)
    {
      Utils.each(this.options.mapping, function (map, index)
      {
        // 1.llamamos a la función de mapeo
        // 2.le pasamos por parametro el marcador
        // 3.seteamos en el marcador el resultado de la funcion
        marker[index] = map(marker);
      });

      return marker;
    }

  , addMarkers: function ()
    {
      var self = this;

      Utils.each(this.markers, function (item)
      {
        self.addMarker(
          self.mapAttributes(item)
        );
      });

      return this;
    }

  , createIcons: function ()
    {
      var self = this
        , options = this.options
        , width = options.image.width
        , height = options.image.height;

      Utils.each(options.icons, function (image, key)
      {
        if (!(key in self.groups))
        {
          self.groups[key] = {};
        }
        
        self.groups[key].icon = new google.maps.MarkerImage(
          image, null, null, null, new google.maps.Size(
            width, height
          )
        );
      });

      return this;
    }

  , toggleType: function (type)
    {
      var group = this.groups[type];

      Utils.each(group.markers, function (marker)
      {
        marker.setVisible(!!group.isHidden);
      });

      group.isHidden = !group.isHidden;

      return this;
    }

  , listen: function (container)
    {
      var self = this;

      container.addEventListener('click', function (e)
      {
        self.toggleType(e.target.dataset.type);
        e.target.dataset.isActive = e.target.dataset.isActive !== 'true';
      }, false);

      return this;
    }

    // Hay que agregarle flexibilidad al html de esto
  , addControls: function (container)
    {
      var list = document.createElement('ul')
        , element = null;

      Utils.each(this.groups, function (item, key)
      {
        element = document.createElement('li');

        element.dataset.type = key;
        element.dataset.isActive = !item.isHidden;

        element.appendChild(
          document.createTextNode(key)
        );

        list.appendChild(element);
      });

      container.appendChild(list);

      return this.listen(container);
    }

  , init: function ()
    {
      if (document.getElementById(this.options.idMap))
      {
        this.map = this.createMap(document.getElementById(this.options.idMap));

        this.userLocationMarker = this.createMarker();
        this.userLocationMarker.setClickable(false);

        this.groups = {};

        if ('geolocation' in navigator)
        {
          this.getUserPosition();
        }
        else
        {
          this.handleInitialLocationError();
        }

        this
          .createIcons()
          .addMarkers();
      }
      else
      {
        this.notify('Map placeholder not found.');
      }

      if (this.options.idControls && document.getElementById(this.options.idControls))
      {
        this.addControls(document.getElementById(this.options.idControls));
      }

      return this;
    }
  });

  window.Donde = Donde;

})(document, window);