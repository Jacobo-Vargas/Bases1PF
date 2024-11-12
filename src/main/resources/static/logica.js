// Función para obtener los empleados
function obtenerEmpleados() {
    fetch('/api/empleados')
        .then(response => response.json())
        .then(empleados => {
            const tbody = document.querySelector('#empleadosTable tbody');
            tbody.innerHTML = ''; // Limpiar tabla antes de llenarla
            empleados.forEach(empleado => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${empleado.id}</td>
                    <td>${empleado.nombre}</td>
                    <td>${empleado.cargo}</td>
                    <td>${empleado.fechaContratacion}</td>
                    <td>${empleado.salario}</td>
                    <td>
                        <button class="btn btn-warning" onclick="editarEmpleado(${empleado.id})">Editar</button>
                        <button class="btn btn-danger" onclick="eliminarEmpleado(${empleado.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
}

// Crear o editar empleado
document.getElementById('formEmpleado').onsubmit = function(event) {
    event.preventDefault();
    const form = event.target;
    const idEmpleado = form.dataset.idEmpleado;
    const empleadoData = {
        nombre: document.getElementById('nombre').value,
        cargo: document.getElementById('cargo').value,
        fechaContratacion: document.getElementById('fechaContratacion').value,
        salario: document.getElementById('salario').value,
        apellidoUno: document.getElementById('apellidoUno').value,
        apellidoDos: document.getElementById('apellidoDos').value
    };
    const method = idEmpleado ? 'PUT' : 'POST';
    const url = idEmpleado ? `/api/empleados/${idEmpleado}` : '/api/empleados';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(empleadoData)
    })
        .then(response => response.json())
        .then(() => {
            obtenerEmpleados();
            form.reset();
            delete form.dataset.idEmpleado;
        });
};

// Función para eliminar un empleado
function eliminarEmpleado(id) {
    fetch(`/api/empleados/${id}`, {
        method: 'DELETE'
    }).then(() => obtenerEmpleados());
}

// Función para editar un empleado
function editarEmpleado(id) {
    fetch(`/api/empleados/${id}`)
        .then(response => response.json())
        .then(empleado => {
            document.getElementById('nombre').value = empleado.nombre;
            document.getElementById('cargo').value = empleado.cargo;
            document.getElementById('fechaContratacion').value = empleado.fechaContratacion;
            document.getElementById('salario').value = empleado.salario;
            document.getElementById('apellidoUno').value = empleado.apellidoUno;
            document.getElementById('apellidoDos').value = empleado.apellidoDos;
            document.getElementById('formEmpleado').dataset.idEmpleado = empleado.id;
        });
}

// Función para obtener los clientes
function obtenerClientes() {
    fetch('/api/clientes')
        .then(response => response.json())
        .then(clientes => {
            const tbody = document.querySelector('#clientesTable tbody');
            tbody.innerHTML = '';
            clientes.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cliente.id}</td>
                    <td>${cliente.cedula}</td>
                    <td>${cliente.nombre}</td>
                    <td>${cliente.apellidoUno}</td>
                    <td>${cliente.apellidoDos}</td>
                    <td>
                        <button class="btn btn-warning" onclick="editarCliente(${cliente.id})">Editar</button>
                        <button class="btn btn-danger" onclick="eliminarCliente(${cliente.id})">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        });
}

// Crear o editar cliente
document.getElementById('formCliente').onsubmit = function(event) {
    event.preventDefault();
    const form = event.target;
    const idCliente = form.dataset.idCliente;
    const clienteData = {
        cedula: document.getElementById('cedula').value,
        nombre: document.getElementById('nombreCliente').value,
        apellidoUno: document.getElementById('apellidoUnoCliente').value,
        apellidoDos: document.getElementById('apellidoDosCliente').value,
        fechaNacimiento: document.getElementById('fechaNacimiento').value
    };
    const method = idCliente ? 'PUT' : 'POST';
    const url = idCliente ? `/api/clientes/${idCliente}` : '/api/clientes';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(clienteData)
    })
        .then(response => response.json())
        .then(() => {
            obtenerClientes();
            form.reset();
            delete form.dataset.idCliente;
        });
};

// Función para eliminar un cliente
function eliminarCliente(id) {
    fetch(`/api/clientes/${id}`, {
        method: 'DELETE'
    }).then(() => obtenerClientes());
}

// Función para editar un cliente
function editarCliente(id) {
    fetch(`/api/clientes/${id}`)
        .then(response => response.json())
        .then(cliente => {
            document.getElementById('cedula').value = cliente.cedula;
            document.getElementById('nombreCliente').value = cliente.nombre;
            document.getElementById('apellidoUnoCliente').value = cliente.apellidoUno;
            document.getElementById('apellidoDosCliente').value = cliente.apellidoDos;
            document.getElementById('fechaNacimiento').value = cliente.fechaNacimiento;
            document.getElementById('formCliente').dataset.idCliente = cliente.id;
        });
}

document.addEventListener('DOMContentLoaded', function() {
    obtenerEmpleados();
    obtenerClientes();
});
